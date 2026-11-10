const BLOCKED_PATH = /(?:^|\/)(logout|log-out|sign-out|signout|delete|destroy)(?:\/|$)/i;
const LOGIN_PATH = /(?:^|\/)(login|log-in|sign-in|signin|auth)(?:\/|$)/i;
const FILE_PATH = /\.(?:pdf|zip|png|jpe?g|gif|svg|webp|css|js|mjs|map|ico|woff2?|ttf|mp4|csv|xlsx?|docx?)$/i;
const SKIP_TEXT = /^(log\s*out|sign\s*out|logout|delete|remove)$/i;

export function isDetailPath(listUrl: string, nextUrl: string) {
  try {
    const listPath = new URL(listUrl).pathname.replace(/\/$/, "");
    const nextPath = new URL(nextUrl).pathname.replace(/\/$/, "");
    return nextPath.startsWith(`${listPath}/`) && nextPath.length > listPath.length + 1;
  } catch {
    return false;
  }
}

const DETAIL_ACTION = /^(view|view details|details|detail|see details|open details)(?:\s+(?![\d])[^\d]{0,30})?$/i;
const ACTION_MENU = /^(more|more actions|actions|options|menu|\.\.\.)$/i;
const UNSAFE_ACTION = /delete|remove|download|edit|approve|decline|blacklist|logout|sign\s*out/i;

export function isDetailActionName(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || text.length > 40 || UNSAFE_ACTION.test(text)) return false;
  return DETAIL_ACTION.test(text);
}

export function isActionMenuName(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || text.length > 40 || UNSAFE_ACTION.test(text)) return false;
  return ACTION_MENU.test(text);
}

export function isDataRowText(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length < 12) return false;
  return !/^(no\.?\b|registration date|date\b|search\b)/i.test(text);
}

export function isLoginPath(value: string) {
  try {
    return LOGIN_PATH.test(new URL(value).pathname);
  } catch {
    return false;
  }
}

export function normalizePageUrl(rawHref: string, pageUrl: string, origin: string) {
  const trimmed = rawHref.trim();
  if (!trimmed || trimmed.startsWith("#") || /^(?:mailto:|tel:|javascript:)/i.test(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(trimmed, pageUrl);
  } catch {
    return null;
  }

  if (url.origin !== origin || (url.protocol !== "http:" && url.protocol !== "https:")) return null;
  url.hash = "";
  url.search = "";
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  if (FILE_PATH.test(url.pathname) || BLOCKED_PATH.test(url.pathname) || LOGIN_PATH.test(url.pathname)) {
    return null;
  }
  return url.toString();
}

const DETAIL_NAME_SKIP = new Set(["detail", "details", "management", "page", "list", "the", "and", "for"]);

export function detailPageName(listName: string, heading: string) {
  const list = listName.replace(/\s+/g, " ").trim();
  const title = heading.replace(/\s+/g, " ").trim();
  const listWords = nameWords(list);
  const related = title.length > 0 && title.length <= 80 && listWords.some((word) => nameWords(title).includes(word));
  if (!list) return title || "Detail";
  if (related) return title;
  return `${list} detail`;
}

function nameWords(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !DETAIL_NAME_SKIP.has(word));
}

export function pageLabel(url: string, preferred?: string) {
  const text = preferred?.replace(/\s+/g, " ").trim() ?? "";
  if (text && text.length <= 60 && !/^https?:/i.test(text) && !SKIP_TEXT.test(text)) return text;

  const path = new URL(url).pathname;
  if (path === "/" || path === "") return "Home";
  const segment = decodeURIComponent(path.split("/").filter(Boolean).at(-1) ?? "Page");
  const words = segment.replace(/[-_]+/g, " ").trim();
  if (!words) return "Page";
  return words.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

export function pagePath(url: string) {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}` || "/";
}

const SIMILAR_PAGE_LIMIT = 2;

export function pageShape(url: string) {
  const path = new URL(url).pathname
    .split("/")
    .map((segment) => (isIdSegment(decodeURIComponent(segment)) ? ":id" : segment))
    .join("/");
  return path || "/";
}

export function allowSimilarPage(url: string, counts: Map<string, number>) {
  const shape = pageShape(url);
  if (!shape.includes("/:id")) return true;
  const count = counts.get(shape) ?? 0;
  if (count >= SIMILAR_PAGE_LIMIT) return false;
  counts.set(shape, count + 1);
  return true;
}

export function nextPageLinks(
  discovered: Array<{ href: string; text: string }>,
  pageUrl: string,
  origin: string,
  reserved: Set<string>,
) {
  const unique = new Map<string, string>();
  for (const link of discovered) {
    if (SKIP_TEXT.test(link.text.replace(/\s+/g, " ").trim())) continue;
    const url = normalizePageUrl(link.href, pageUrl, origin);
    if (!url || reserved.has(url) || unique.has(url)) continue;
    unique.set(url, pageLabel(url, link.text));
  }

  return [...unique.entries()]
    .map(([url, name]) => ({ url, name }))
    .sort((left, right) => pathDepth(left.url) - pathDepth(right.url) || left.url.localeCompare(right.url));
}

function pathDepth(url: string) {
  return new URL(url).pathname.split("/").filter(Boolean).length;
}

function isIdSegment(segment: string) {
  return (
    /^\d+$/.test(segment) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
  );
}
