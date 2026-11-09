export type SavedPageSource = "discovered" | "manual";
export type SavedPageStatus = "loaded" | "failed";

export interface SavedPageDraft {
  name: string;
  url: string;
  source: SavedPageSource;
  lastStatus?: SavedPageStatus | null;
}

export class PageListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PageListError";
  }
}

export function normalizeSavedPageUrl(siteUrl: string, raw: string) {
  let site: URL;
  try {
    site = new URL(siteUrl);
  } catch {
    throw new PageListError("Enter a valid website URL.");
  }

  let page: URL;
  try {
    page = new URL(raw.trim(), site);
  } catch {
    throw new PageListError("Enter a valid page URL.");
  }

  if (page.username || page.password) {
    throw new PageListError("Page URLs cannot contain a username or password.");
  }
  if (page.protocol !== "http:" && page.protocol !== "https:") {
    throw new PageListError("Page URLs must start with http:// or https://.");
  }
  if (page.origin !== site.origin) {
    throw new PageListError("Page URLs must stay on the same website.");
  }

  page.hash = "";
  if (page.pathname.length > 1 && page.pathname.endsWith("/")) {
    page.pathname = page.pathname.slice(0, -1);
  }
  return page.toString();
}

export function uniquePages(siteUrl: string, pages: SavedPageDraft[]) {
  const seen = new Set<string>();
  return pages.map((page) => {
    const name = page.name.replace(/\s+/g, " ").trim();
    if (!name) throw new PageListError("Every page needs a name.");
    const url = normalizeSavedPageUrl(siteUrl, page.url);
    if (seen.has(url)) throw new PageListError("Each page URL can only be saved once.");
    seen.add(url);
    return {
      name,
      url,
      source: page.source,
      lastStatus: page.lastStatus ?? null,
    };
  });
}

export function mergeDiscoveredPages(siteUrl: string, current: SavedPageDraft[], discovered: SavedPageDraft[]) {
  const manual = uniquePages(
    siteUrl,
    current.filter((page) => page.source === "manual"),
  );
  const manualUrls = new Set(manual.map((page) => page.url));
  const nextDiscovered: SavedPageDraft[] = [];
  const seen = new Set(manualUrls);

  for (const page of discovered) {
    let url: string;
    try {
      url = normalizeSavedPageUrl(siteUrl, page.url);
    } catch {
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);
    const name = page.name.replace(/\s+/g, " ").trim();
    if (!name) continue;
    nextDiscovered.push({
      name,
      url,
      source: "discovered",
      lastStatus: page.lastStatus ?? null,
    });
  }

  return [...nextDiscovered, ...manual];
}

export function pagesFromCheckRows(
  siteUrl: string,
  rows: Array<{ name: string; path: string; url: string; state: string }>,
) {
  const drafts: SavedPageDraft[] = [];
  for (const row of rows) {
    if (row.state !== "loaded" && row.state !== "failed") continue;
    if (row.url.includes("#detail")) continue;
    const path = row.path.startsWith("/") ? row.path : "/";
    drafts.push({
      name: row.name,
      url: path,
      source: "discovered",
      lastStatus: row.state,
    });
  }

  const seen = new Set<string>();
  const unique: SavedPageDraft[] = [];
  for (const page of drafts) {
    let url: string;
    try {
      url = normalizeSavedPageUrl(siteUrl, page.url);
    } catch {
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);
    unique.push({ ...page, url });
  }
  return unique;
}
