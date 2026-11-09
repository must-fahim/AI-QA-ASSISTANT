import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { assertPublicHttpUrl } from "@/lib/page-visit/public-url";
import type { PageObservation } from "@/services/page-visit/compose-requirement";
import { launchChromium, openPage, safeMessage, signIn } from "@/services/page-visit/browser";

interface VisitInput {
  url: string;
  loginEmail?: string;
  loginPassword?: string;
}

export async function visitPage(input: VisitInput): Promise<PageObservation> {
  const target = await assertPublicHttpUrl(input.url);
  const email = input.loginEmail?.trim() ?? "";
  const password = input.loginPassword ?? "";
  const browser = await launchChromium();

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await openPage(page, target.toString());
    if (email || password) {
      await signIn(page, email, password);
      if (!page.url().startsWith(target.origin + target.pathname)) {
        await openPage(page, target.toString());
      }
    }

    const finalUrl = page.url();
    await assertPublicHttpUrl(finalUrl);
    const observation = await page.evaluate(() => {
      const controls = [...document.querySelectorAll("input, textarea, select, button, a")]
        .map((element) => describeControl(element))
        .filter((line) => line.length > 0)
        .slice(0, 80);
      return {
        title: document.title,
        text: document.body?.innerText ?? "",
        controls,
      };

      function describeControl(element: Element) {
        const control = element as HTMLInputElement & HTMLElement;
        const tag = element.tagName.toLowerCase();
        const type = control.type || tag;
        const label = (
          control.getAttribute("aria-label") ||
          control.placeholder ||
          control.innerText ||
          control.name ||
          ""
        )
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 180);
        if (!label) return "";
        const maxLength = control.maxLength > 0 ? ` max ${control.maxLength}` : "";
        return `${type}: ${label}${maxLength}`;
      }
    });

    return {
      finalUrl,
      title: observation.title.slice(0, 200),
      controls: observation.controls,
      text: observation.text,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error("page visit failed", { message: safeMessage(error, password) });
    throw new AppError(
      "The page could not be opened. Check the URL and login, then try again.",
      502,
      "PAGE_VISIT_FAILED",
    );
  } finally {
    await browser.close();
  }
}
