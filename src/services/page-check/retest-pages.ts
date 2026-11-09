import type { Page } from "playwright";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { assertPublicHttpUrl } from "@/lib/page-visit/public-url";
import { launchChromium, safeMessage, signIn } from "@/services/page-visit/browser";
import { classifyPageLoad, type PageLoadState } from "@/services/page-check/classify-page";
import { pagePath } from "@/services/page-check/links";
import type { PageCheckEvent } from "@/services/page-check/types";

interface RetestPage {
  name: string;
  url: string;
}

interface RetestInput {
  siteUrl: string;
  loginEmail?: string;
  loginPassword?: string;
  pages: RetestPage[];
}

export interface RetestOutcome {
  checked: number;
  failed: number;
  results: Array<{ url: string; status: PageLoadState }>;
}

export async function retestSavedPages(input: RetestInput, emit: (event: PageCheckEvent) => void): Promise<RetestOutcome> {
  const start = await assertPublicHttpUrl(input.siteUrl);
  const email = input.loginEmail?.trim() ?? "";
  const password = input.loginPassword ?? "";
  const browser = await launchChromium();
  const results: RetestOutcome["results"] = [];
  let failed = 0;

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on("dialog", (dialog) => {
      void dialog.dismiss().catch(() => undefined);
    });
    let signedIn = false;

    for (const item of input.pages) {
      emit({ type: "checking", url: item.url, name: item.name, path: pagePath(item.url) });
      try {
        const response = await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 20_000 });
        await waitForContent(page);
        if (!signedIn && password) {
          signedIn = true;
          if ((await page.locator('input[type="password"]').count()) > 0) {
            await signIn(page, email, password);
            if (!samePath(page.url(), item.url)) {
              await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 20_000 });
              await waitForContent(page);
            }
          }
        }
        const snapshot = await readSnapshot(page);
        const outcome = outcomeFor(response?.status() ?? null, snapshot);
        if (outcome.status === "failed") failed += 1;
        results.push({ url: item.url, status: outcome.status });
        emit({
          type: "result",
          url: item.url,
          name: item.name,
          path: pagePath(page.url().startsWith(start.origin) ? page.url() : item.url),
          status: outcome.status,
          detail: outcome.detail,
        });
      } catch (error) {
        if (error instanceof AppError && error.code === "PAGE_LOGIN_FAILED") throw error;
        logger.error("saved page retest failed", { message: safeMessage(error, password) });
        failed += 1;
        results.push({ url: item.url, status: "failed" });
        emit({
          type: "result",
          url: item.url,
          name: item.name,
          path: pagePath(item.url),
          status: "failed",
          detail: "Failed to load",
        });
      }
    }

    logger.info("saved page retest finished", { host: start.host, checked: results.length, failed });
    emit({ type: "done", checked: results.length, failed, truncated: false });
    return { checked: results.length, failed, results };
  } finally {
    await browser.close();
  }
}

function outcomeFor(
  httpStatus: number | null,
  snapshot: { title: string; text: string; passwordVisible: boolean },
) {
  const text = snapshot.text.replace(/\s+/g, " ").trim();
  if (snapshot.passwordVisible && text.length < 500) {
    return { status: "failed" as const, detail: "Failed to load" };
  }
  return classifyPageLoad({ httpStatus, title: snapshot.title, text: snapshot.text });
}

async function readSnapshot(page: Page) {
  return page.evaluate(() => ({
    title: document.title ?? "",
    text: document.body?.innerText ?? "",
    passwordVisible: document.querySelector('input[type="password"]') != null,
  }));
}

async function waitForContent(page: Page) {
  await page
    .waitForFunction(
      () =>
        (document.body?.innerText?.trim().length ?? 0) > 20 ||
        document.querySelector('input[type="password"]') != null,
      { timeout: 10_000 },
    )
    .catch(() => undefined);
}

function samePath(left: string, right: string) {
  try {
    return new URL(left).pathname === new URL(right).pathname;
  } catch {
    return false;
  }
}
