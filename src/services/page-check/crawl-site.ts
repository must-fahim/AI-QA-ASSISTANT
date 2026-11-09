import type { Page } from "playwright";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { assertPublicHttpUrl } from "@/lib/page-visit/public-url";
import { closeBrowser, launchChromium, safeMessage, signIn } from "@/services/page-visit/browser";
import { classifyPageLoad, type PageLoadState } from "@/services/page-check/classify-page";
import {
  isActionMenuName,
  isDataRowText,
  isDetailActionName,
  isDetailPath,
  isLoginPath,
  nextPageLinks,
  normalizePageUrl,
  pageLabel,
  pagePath,
  allowSimilarPage,
} from "@/services/page-check/links";
import type { PageCheckEvent } from "@/services/page-check/types";

const MAX_PAGES = 45;

interface CrawlInput {
  siteUrl: string;
  loginEmail?: string;
  loginPassword?: string;
}

interface PageSnapshot {
  title: string;
  text: string;
  active: string;
  passwordVisible: boolean;
  links: Array<{ href: string; text: string }>;
}

export async function crawlSite(input: CrawlInput, emit: (event: PageCheckEvent) => void) {
  const start = await assertPublicHttpUrl(input.siteUrl);
  const origin = start.origin;
  const email = input.loginEmail?.trim() ?? "";
  const password = input.loginPassword ?? "";
  const browser = await launchChromium();
  const seen = new Set<string>();
  const similarPages = new Map<string, number>();
  const queue: Array<{ url: string; name: string }> = [
    { url: start.toString(), name: pageLabel(start.toString()) },
  ];
  let checked = 0;
  let failed = 0;
  let truncated = false;
  let loginHandled = false;
  let menuDiscovered = false;

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on("dialog", (dialog) => {
      void dialog.dismiss().catch(() => undefined);
    });

    while (queue.length > 0 && checked < MAX_PAGES) {
      const current = queue.shift();
      if (!current || seen.has(current.url) || !allowSimilarPage(current.url, similarPages)) continue;
      seen.add(current.url);
      emit({ type: "checking", url: current.url, name: current.name, path: pagePath(current.url) });

      try {
        const response = await page.goto(current.url, { waitUntil: "domcontentloaded", timeout: 20_000 });
        await waitForContent(page);
        let httpStatus = response?.status() ?? null;
        if (!loginHandled) {
          loginHandled = true;
          const followUp = await signInWhenAsked(page, email, password, origin, current.url);
          if (followUp) httpStatus = followUp.status();
          await waitForContent(page);
        }

        const recorded = await recordPage(page, current, httpStatus, origin, emit);
        if (!recorded) {
          failed += 1;
          checked += 1;
          continue;
        }
        if (recorded.status === "failed") failed += 1;
        checked += 1;
        seen.add(recorded.url);
        const details = await checkPageDetails(page, recorded, origin, seen, similarPages, emit, password);
        checked += details.checked;
        failed += details.failed;
        if (!menuDiscovered && recorded.status === "loaded") {
          menuDiscovered = true;
          const discovered = await discoverMenuPages(page, origin, seen);
          for (const item of discovered) {
            if (checked >= MAX_PAGES) {
              truncated = true;
              break;
            }
            if (seen.has(item.url)) continue;
            seen.add(item.url);
            emit({ type: "checking", url: item.url, name: item.name, path: pagePath(item.url) });
            try {
              const menuResponse = await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 20_000 });
              await waitForContent(page);
              const menuRecord = await recordPage(page, item, menuResponse?.status() ?? null, origin, emit);
              if (!menuRecord || menuRecord.status === "failed") failed += 1;
              checked += 1;
              if (menuRecord?.status === "loaded" && checked < MAX_PAGES) {
                const details = await checkPageDetails(page, menuRecord, origin, seen, similarPages, emit, password);
                checked += details.checked;
                failed += details.failed;
              }
              if (menuRecord && queueLinks(menuRecord.links, menuRecord.pageUrl, origin, seen, queue)) {
                truncated = true;
              }
            } catch (error) {
              if (error instanceof AppError) throw error;
              logger.error("page check navigation failed", { message: safeMessage(error, password) });
              failed += 1;
              checked += 1;
              emit(resultEvent(item, "failed", "Failed to load"));
            }
          }
        }
        if (queueLinks(recorded.links, recorded.pageUrl, origin, seen, queue)) truncated = true;
      } catch (error) {
        if (error instanceof AppError) throw error;
        logger.error("page check navigation failed", { message: safeMessage(error, password) });
        failed += 1;
        checked += 1;
        emit(resultEvent(current, "failed", "Failed to load"));
      }
    }

    if (queue.length > 0) truncated = true;
    logger.info("page check finished", { host: start.host, checked, failed, truncated });
    emit({ type: "done", checked, failed, truncated });
  } finally {
    await closeBrowser(browser);
  }
}

interface RecordedPage {
  url: string;
  pageUrl: string;
  name: string;
  status: PageLoadState;
  links: Array<{ href: string; text: string }>;
}

async function recordPage(
  page: Page,
  current: { url: string; name: string },
  httpStatus: number | null,
  origin: string,
  emit: (event: PageCheckEvent) => void,
): Promise<RecordedPage | null> {
  const finalUrl = page.url();
  if (!finalUrl.startsWith(origin)) {
    emit(resultEvent(current, "failed", "Failed to load"));
    return null;
  }

  const snapshot = await readSnapshot(page);
  if (isLoginWall(snapshot)) {
    emit(resultEvent(current, "failed", "Failed to load"));
    return null;
  }

  const outcome = classifyPageLoad({
    httpStatus,
    title: snapshot.title,
    text: snapshot.text,
  });
  const normalized = normalizePageUrl(finalUrl, finalUrl, origin) ?? stripSearch(finalUrl);
  const linkName = isLoginPath(current.url) ? "" : current.name;
  const name =
    current.name.endsWith(" detail") || /details$/i.test(current.name)
      ? current.name
      : displayName(normalized, linkName, snapshot.active, snapshot.title);
  emit({
    type: "result",
    url: current.url,
    name,
    path: pagePath(stripHash(finalUrl)),
    status: outcome.status,
    detail: outcome.detail,
  });
  return { url: normalized, pageUrl: finalUrl, name, status: outcome.status, links: snapshot.links };
}

async function checkPageDetails(
  page: Page,
  list: RecordedPage,
  origin: string,
  seen: Set<string>,
  similarPages: Map<string, number>,
  emit: (event: PageCheckEvent) => void,
  password: string,
) {
  const totals = { checked: 0, failed: 0 };
  if (seen.size >= MAX_PAGES) return totals;
  const listUrl = list.pageUrl;
  await revealTables(page);

  const antTables = page.locator(".ant-table");
  const antCount = await antTables.count();
  const tables = antCount > 0 ? antTables : page.locator("table");
  const tableCount = antCount > 0 ? antCount : await tables.count();
  let opened = 0;

  for (let tableIndex = 0; tableIndex < tableCount && seen.size < MAX_PAGES; tableIndex += 1) {
    const rows = tables.nth(tableIndex).locator("tbody tr");
    const rowCount = await rows.count();
    let openedFromTable = 0;
    for (
      let rowIndex = 0;
      rowIndex < Math.min(rowCount, 20) && openedFromTable < 2 && seen.size < MAX_PAGES;
      rowIndex += 1
    ) {
      if (!samePath(page.url(), listUrl)) await returnToList(page, listUrl);
      const row = tables.nth(tableIndex).locator("tbody tr").nth(rowIndex);
      const text = (await row.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
      if (!isDataRowText(text)) continue;
      const before = page.url();
      const kind = await clickRowTarget(page, row);
      if (!kind) continue;
      const outcome = await acceptOpenedDetail(page, list, before, kind, origin, seen, similarPages, emit, password);
      if (outcome === "repeat") {
        await returnToList(page, listUrl);
        break;
      }
      if (!outcome) {
        if (page.url() !== before) await returnToList(page, listUrl);
        continue;
      }
      opened += 1;
      openedFromTable += 1;
      totals.checked += 1;
      if (outcome === "failed") totals.failed += 1;
      await returnToList(page, listUrl);
    }
  }

  if (opened === 0 && seen.size < MAX_PAGES) {
    const before = page.url();
    const kind = await clickDetailTarget(page);
    if (kind) {
      const outcome = await acceptOpenedDetail(page, list, before, kind, origin, seen, similarPages, emit, password);
      if (outcome === "loaded" || outcome === "failed") {
        totals.checked += 1;
        if (outcome === "failed") totals.failed += 1;
      }
    }
  }

  if (!samePath(page.url(), listUrl)) await returnToList(page, listUrl);
  return totals;
}

async function acceptOpenedDetail(
  page: Page,
  list: RecordedPage,
  listUrl: string,
  opened: "action" | "row",
  origin: string,
  seen: Set<string>,
  similarPages: Map<string, number>,
  emit: (event: PageCheckEvent) => void,
  password: string,
): Promise<"loaded" | "failed" | "repeat" | null> {
  await page
    .waitForFunction((previous) => location.href !== previous, listUrl, { timeout: 3_000 })
    .catch(() => undefined);
  await waitForContent(page);
  const landed = page.url();
  const normalized = normalizePageUrl(landed, landed, origin);
  const movedToDetail =
    Boolean(normalized) &&
    landed.startsWith(origin) &&
    !seen.has(normalized ?? "") &&
    (isDetailPath(listUrl, landed) || (opened === "action" && !samePath(listUrl, landed)));
  if (!movedToDetail || !normalized) {
    if (opened === "action" && samePath(listUrl, landed)) {
      const dialog = await readOpenDetail(page);
      if (dialog) {
        const key = `${normalized ?? stripSearch(listUrl)}#detail`;
        if (seen.has(key)) return null;
        seen.add(key);
        const name = `${list.name} detail`;
        const outcome = classifyPageLoad({ httpStatus: 200, title: dialog.title, text: dialog.text });
        emit({ type: "checking", url: key, name, path: pagePath(listUrl) });
        emit({
          type: "result",
          url: key,
          name,
          path: pagePath(listUrl),
          status: outcome.status,
          detail: outcome.detail,
        });
        return outcome.status;
      }
    }
    return null;
  }

  seen.add(normalized);
  if (!allowSimilarPage(normalized, similarPages)) return "repeat";
  const heading = await detailHeading(page);
  const name = heading || `${list.name} detail`;
  emit({ type: "checking", url: normalized, name, path: pagePath(normalized) });
  try {
    const recorded = await recordPage(page, { url: normalized, name }, null, origin, emit);
    return recorded?.status ?? "failed";
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error("page check detail failed", { message: safeMessage(error, password) });
    emit(resultEvent({ url: normalized, name }, "failed", "Failed to load"));
    return "failed";
  }
}

async function returnToList(page: Page, listUrl: string) {
  await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 20_000 }).catch(() => undefined);
  await revealTables(page);
}

async function revealTables(page: Page) {
  const table = page.locator(".ant-table, table").first();
  if ((await table.count()) > 0) await table.scrollIntoViewIfNeeded().catch(() => undefined);
  await page
    .waitForFunction(() => {
      const rows = [...document.querySelectorAll(".ant-table-tbody tr, table tbody tr")];
      return rows.some((row) => {
        const text = ((row as HTMLElement).innerText || "").replace(/\s+/g, " ").trim();
        return text.length >= 12 && !/^(no\.?\b|registration date|date\b|search\b)/i.test(text);
      });
    }, { timeout: 8_000 })
    .catch(() => undefined);
}

async function detailHeading(page: Page) {
  await page
    .waitForFunction(() => /details/i.test(document.body?.innerText || ""), { timeout: 4_000 })
    .catch(() => undefined);
  return page.evaluate(() => {
    const text = (document.body?.innerText || "").replace(/\s+/g, " ");
    const match = text.match(/\b([A-Za-z][A-Za-z ]{2,30}?Details)\b/);
    return match?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  });
}

async function clickRowTarget(page: Page, row: ReturnType<Page["locator"]>): Promise<"action" | "row" | null> {
  const before = page.url();
  const tried =
    (await clickNamedDetail(row)) || (await clickContentLink(page, row)) || (await clickPopoverDetail(page, row));
  if (tried) {
    const moved = await page
      .waitForFunction((previous) => location.href !== previous, before, { timeout: 1_500 })
      .then(() => true)
      .catch(() => false);
    if (moved || (await readOpenDetail(page))) return "action";
  }

  const cells = row.locator("td");
  const cellCount = await cells.count();
  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    const cell = cells.nth(cellIndex);
    const cellText = (await cell.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    if (!cellText || cellText.length > 80) continue;
    if (await cell.locator("input, button, a").count()) continue;
    if (/delete|remove|download|blacklist|approve|decline/i.test(cellText)) continue;
    await cell.click({ timeout: 3_000 }).catch(() => undefined);
    const moved = await page
      .waitForFunction((previous) => location.href !== previous, before, { timeout: 1_500 })
      .then(() => true)
      .catch(() => false);
    if (moved) return "row";
    break;
  }
  await row.click({ timeout: 3_000 }).catch(() => undefined);
  return "row";
}

async function clickDetailTarget(page: Page): Promise<"action" | "row" | null> {
  await page
    .waitForFunction(() => {
      const rows = [...document.querySelectorAll("table tbody tr, [role='row']")];
      const hasDataRow = rows.some((row) => {
        const text = ((row as HTMLElement).innerText || "").replace(/\s+/g, " ").trim();
        return text.length >= 12 && !/^(no\.?\b|registration date|date\b|search\b)/i.test(text);
      });
      const action = document.querySelector("a, button");
      const actionText = (action?.textContent || action?.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
      return hasDataRow || /^(view|view details|details|detail)\b/i.test(actionText);
    }, { timeout: 5_000 })
    .catch(() => undefined);

  const rows = page.locator("table tbody tr, [role='row']");
  const count = await rows.count();
  for (let index = 0; index < Math.min(count, 12); index += 1) {
    const row = rows.nth(index);
    const text = (await row.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    if (!isDataRowText(text)) continue;
    const before = page.url();
    const tried =
      (await clickNamedDetail(row)) ||
      (await clickContentLink(page, row)) ||
      (await clickPopoverDetail(page, row));
    if (!tried) continue;
    const moved = await page
      .waitForFunction((previous) => location.href !== previous, before, { timeout: 1_500 })
      .then(() => true)
      .catch(() => false);
    if (moved || (await readOpenDetail(page))) return "action";
  }

  const root = (await page.locator("main").count()) > 0 ? page.locator("main").first() : page.locator("body");
  const beforeRoot = page.url();
  if (await clickNamedDetail(root)) {
    const moved = await page
      .waitForFunction((previous) => location.href !== previous, beforeRoot, { timeout: 1_500 })
      .then(() => true)
      .catch(() => false);
    if (moved || (await readOpenDetail(page))) return "action";
  }

  for (let index = 0; index < Math.min(count, 12); index += 1) {
    const row = rows.nth(index);
    const text = (await row.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    if (!isDataRowText(text)) continue;
    const cells = row.locator("td");
    const cellCount = await cells.count();
    for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
      const cell = cells.nth(cellIndex);
      const cellText = (await cell.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
      if (!cellText || cellText.length > 80) continue;
      if (await cell.locator("input, button, a").count()) continue;
      if (/delete|remove|download|blacklist|approve|decline/i.test(cellText)) continue;
      await cell.click({ timeout: 3_000 }).catch(() => undefined);
      return "row";
    }
    await row.click({ timeout: 3_000 }).catch(() => undefined);
    return "row";
  }
  return null;
}

async function clickNamedDetail(scope: ReturnType<Page["locator"]>) {
  const action = scope
    .getByRole("link", { name: /^(view|view details|details|detail|see details)\b/i })
    .or(scope.getByRole("button", { name: /^(view|view details|details|detail|see details)\b/i }))
    .first();
  if ((await action.count()) === 0) return false;
  const label = `${await action.innerText().catch(() => "")} ${await action.getAttribute("aria-label").catch(() => "")}`;
  if (!isDetailActionName(label)) return false;
  await action.click({ timeout: 3_000 }).catch(() => undefined);
  return true;
}

async function clickContentLink(page: Page, row: ReturnType<Page["locator"]>) {
  const links = row.locator("a[href]");
  const count = await links.count();
  const current = page.url();
  for (let index = 0; index < Math.min(count, 6); index += 1) {
    const link = links.nth(index);
    const href = await link.getAttribute("href");
    const label = (await link.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    if (!href || /delete|remove|download|logout|sign\s*out/i.test(label)) continue;
    let next: URL;
    try {
      next = new URL(href, current);
    } catch {
      continue;
    }
    if (next.origin !== new URL(current).origin || samePath(next.toString(), current) || isLoginPath(next.toString())) {
      continue;
    }
    await link.click({ timeout: 3_000 }).catch(() => undefined);
    return true;
  }
  return false;
}

async function clickPopoverDetail(page: Page, row: ReturnType<Page["locator"]>) {
  const named = row.getByRole("button", { name: /^(more|more actions|actions|options|menu|\.\.\.)$/i }).first();
  const popup = row.locator("button[aria-haspopup='menu'], button[aria-haspopup='true']").first();
  const trigger = (await named.count()) > 0 ? named : popup;
  if ((await trigger.count()) === 0) return false;
  const triggerLabel = (await trigger.getAttribute("aria-label").catch(() => "")) || (await trigger.innerText().catch(() => ""));
  if (triggerLabel.trim() && !isActionMenuName(triggerLabel) && (await named.count()) === 0) return false;
  await trigger.click({ timeout: 3_000 }).catch(() => undefined);
  const item = page
    .locator("[role='menuitem'], .ant-dropdown-menu-item, .ant-popover-inner a, .ant-popover-inner button")
    .filter({ hasText: /^(view|view details|details|detail|see details)\b/i })
    .first();
  if ((await item.count()) === 0) {
    await page.keyboard.press("Escape").catch(() => undefined);
    return false;
  }
  await item.click({ timeout: 3_000 }).catch(() => undefined);
  return true;
}

async function readOpenDetail(page: Page) {
  const dialog = page.locator(".ant-drawer-open .ant-drawer-body, .ant-modal-content, [role='dialog']").last();
  if ((await dialog.count()) === 0 || !(await dialog.isVisible().catch(() => false))) return null;
  const text = (await dialog.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
  if (text.length < 40) return null;
  const title = (await dialog.locator("h1, h2, h3").first().innerText().catch(() => "")).trim();
  return { title, text };
}

async function discoverMenuPages(page: Page, origin: string, seen: Set<string>) {
  const clicked = new Set<string>();
  const found = new Map<string, string>();

  for (let step = 0; step < 40; step += 1) {
    const labels = await page.locator("aside button, nav button").evaluateAll((buttons) => {
      const values = buttons
        .map((button) => (button.textContent || "").replace(/\s+/g, " ").trim())
        .filter((text) => text.length > 1 && text.length <= 80 && !/^(log\s*out|sign\s*out|logout)$/i.test(text));
      return [...new Set(values)];
    });
    const next = labels.find((label) => !clicked.has(label));
    if (!next) break;
    clicked.add(next);

    const button = page
      .locator("aside button, nav button")
      .filter({ has: page.getByText(next, { exact: true }) })
      .first();
    if ((await button.count()) === 0) continue;
    const before = page.url();
    await button.click({ timeout: 3_000 }).catch(() => undefined);
    await page
      .waitForFunction((previous) => location.href !== previous, before, { timeout: 2_500 })
      .catch(() => undefined);
    await waitForContent(page);
    const normalized = normalizePageUrl(page.url(), page.url(), origin);
    if (!normalized || seen.has(normalized) || found.has(normalized)) continue;
    found.set(normalized, next);
  }

  return [...found.entries()].map(([url, name]) => ({ url, name }));
}

function queueLinks(
  links: Array<{ href: string; text: string }>,
  pageUrl: string,
  origin: string,
  seen: Set<string>,
  queue: Array<{ url: string; name: string }>,
) {
  const reserved = new Set([...seen, ...queue.map((item) => item.url)]);
  const room = MAX_PAGES - reserved.size;
  const next = nextPageLinks(links, pageUrl, origin, reserved);
  queue.push(...next.slice(0, Math.max(room, 0)));
  return next.length > room;
}

async function signInWhenAsked(page: Page, email: string, password: string, origin: string, requestedUrl: string) {
  if ((await page.locator('input[type="password"]').count()) === 0) return null;
  await signIn(page, email, password);
  if (!page.url().startsWith(origin)) {
    throw new AppError("Sign-in left the website.", 502, "PAGE_VISIT_FAILED");
  }
  if (isLoginPath(requestedUrl) || samePath(page.url(), requestedUrl)) return null;
  return page.goto(requestedUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
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

async function readSnapshot(page: Page): Promise<PageSnapshot> {
  return page.evaluate(() => {
    const items = [...document.querySelectorAll("aside a, aside button, nav a, nav button, .ant-menu-item")];
    const selected = items.find((item) => {
      const className = String(item.className || "");
      if (item.getAttribute("aria-current") === "page" || item.classList.contains("ant-menu-item-selected")) return true;
      return /\b(bg-soft|text-primary|router-link-active)\b/.test(className) && !/\btext-font-soft\b/.test(className);
    });
    const active = (selected?.textContent || "").replace(/\s+/g, " ").trim();
    const links = [...document.querySelectorAll("a[href]")]
      .slice(0, 80)
      .map((anchor) => ({
        href: anchor.getAttribute("href") ?? "",
        text: (anchor.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
      }));
    return {
      title: document.title ?? "",
      text: document.body?.innerText ?? "",
      active,
      passwordVisible: document.querySelector('input[type="password"]') != null,
      links,
    };
  });
}

function resultEvent(
  current: { url: string; name: string },
  status: PageLoadState,
  detail: string,
): PageCheckEvent {
  return {
    type: "result",
    url: current.url,
    name: current.name,
    path: pagePath(current.url),
    status,
    detail,
  };
}

function stripHash(value: string) {
  const url = new URL(value);
  url.hash = "";
  return url.toString();
}

function stripSearch(value: string) {
  const url = new URL(value);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function displayName(url: string, linkName: string, active: string, title: string) {
  if (active.trim()) return pageLabel(url, active);
  const fromLink = pageLabel(url, linkName);
  if (fromLink !== "Home" && fromLink !== "Page") return fromLink;
  const fromTitle = title.split(/[|\-–—]/)[0]?.replace(/\s+/g, " ").trim() ?? "";
  if (fromTitle && fromTitle.length <= 60 && !/^https?:/i.test(fromTitle)) return fromTitle;
  return fromLink;
}

function isLoginWall(snapshot: PageSnapshot) {
  const text = snapshot.text.replace(/\s+/g, " ").trim();
  return snapshot.passwordVisible && text.length < 500;
}

function samePath(left: string, right: string) {
  try {
    return new URL(left).pathname === new URL(right).pathname;
  } catch {
    return false;
  }
}
