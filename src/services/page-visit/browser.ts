import { createRequire } from "node:module";
import type { Page } from "playwright";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function launchChromium() {
  const { chromium } = createRequire(`${process.cwd()}/package.json`)("playwright") as typeof import("playwright");
  return chromium.launch({ headless: true }).catch((error: unknown) => {
    logger.error("page browser failed to launch", {
      message: error instanceof Error ? error.message.slice(0, 300) : "launch failed",
    });
    throw new AppError(
      "The page browser is not installed. Run npx playwright install chromium, then try again.",
      503,
      "PAGE_BROWSER_MISSING",
    );
  });
}

export async function openPage(page: Page, url: string) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page
      .waitForFunction(() => (document.body?.innerText?.trim().length ?? 0) > 20, { timeout: 10_000 })
      .catch(() => undefined);
  } catch (error) {
    logger.error("page navigation failed", {
      message: error instanceof Error ? error.message.slice(0, 300) : "navigation failed",
    });
    throw new AppError("The page did not load.", 502, "PAGE_VISIT_FAILED");
  }
}

export async function dismissOverlays(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const modal = page.locator(".ant-modal-wrap").last();
    const visible = (await modal.count()) > 0 && (await modal.isVisible().catch(() => false));
    if (!visible) return;
    const button = modal.getByRole("button", { name: /check|confirm|ok|agree|close|확인/i }).last();
    if ((await button.count()) === 0) return;
    await button.click({ timeout: 3_000 }).catch(() => undefined);
  }
}

export async function signIn(page: Page, email: string, password: string) {
  const passwordField = page.locator('input[type="password"]').first();
  if ((await passwordField.count()) === 0) return;
  if (!email || !password) {
    throw new AppError("This page is asking for a login. Enter the email and password.", 400, "PAGE_LOGIN_REQUIRED");
  }

  const emailField = page.locator('input[type="email"], input[type="text"]').first();
  await emailField.fill(email);
  await passwordField.fill(password);
  await dismissOverlays(page);
  const submit = page.getByRole("button", { name: /log\s*in|login|sign\s*in|sign-in/i }).first();
  if ((await submit.count()) === 0) {
    throw new AppError("A login form was found, but no login button was visible.", 502, "PAGE_VISIT_FAILED");
  }
  await submit.click();
  await page
    .waitForFunction(() => document.querySelector('input[type="password"]') == null, { timeout: 15_000 })
    .catch(() => undefined);

  if ((await page.locator('input[type="password"]').count()) > 0) {
    throw new AppError("Sign-in did not complete. Check the email and password.", 401, "PAGE_LOGIN_FAILED");
  }
}

export function safeMessage(error: unknown, password: string) {
  const message = error instanceof Error ? error.message : "visit failed";
  return (password ? message.split(password).join("[redacted]") : message).slice(0, 300);
}
