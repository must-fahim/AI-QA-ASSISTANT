export type PageLoadState = "loaded" | "failed";

const BROKEN_PAGE = /application error: a client-side exception|this page could not be found|404 not found|page not found|internal server error|bad gateway|service unavailable|gateway time-?out/i;

export function classifyPageLoad(input: { httpStatus: number | null; title: string; text: string }): {
  status: PageLoadState;
  detail: string;
} {
  if (input.httpStatus != null && input.httpStatus >= 400) {
    return { status: "failed", detail: "Failed to load" };
  }

  const text = input.text.replace(/\s+/g, " ").trim();
  const sample = `${input.title}\n${text.slice(0, 500)}`;
  if (text.length < 20 || BROKEN_PAGE.test(sample)) {
    return { status: "failed", detail: "Failed to load" };
  }

  return { status: "loaded", detail: "Loaded" };
}
