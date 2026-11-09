import { describe, expect, it } from "vitest";
import { classifyPageLoad } from "@/services/page-check/classify-page";
import {
  isActionMenuName,
  isDataRowText,
  isDetailActionName,
  isDetailPath,
  isLoginPath,
  nextPageLinks,
  normalizePageUrl,
  pageLabel,
} from "@/services/page-check/links";

const origin = "https://stg.example.com";

describe("page check links", () => {
  it("keeps same-site pages and detail pages, and skips logout, files, and other sites", () => {
    const links = nextPageLinks(
      [
        { href: "/dashboard", text: "Dashboard" },
        { href: "/create-campaign", text: "Create Campaign" },
        { href: "/campaigns/42", text: "Summer launch" },
        { href: "/logout", text: "Log out" },
        { href: "https://other.example.com/pricing", text: "Pricing" },
        { href: "/guide.pdf", text: "Guide" },
      ],
      `${origin}/dashboard`,
      origin,
      new Set([`${origin}/dashboard`]),
    );

    expect(links.map((link) => link.name)).toEqual(["Create Campaign", "Summer launch"]);
    expect(normalizePageUrl("/campaigns/42?tab=details", `${origin}/dashboard`, origin)).toBe(
      `${origin}/campaigns/42`,
    );
    expect(pageLabel(`${origin}/create-campaign`, "Create Campaign")).toBe("Create Campaign");
    expect(isLoginPath(`${origin}/login`)).toBe(true);
    expect(isLoginPath(`${origin}/dashboard`)).toBe(false);
    expect(
      isDetailPath(`${origin}/member-management/advertiser`, `${origin}/member-management/advertiser/100`),
    ).toBe(true);
    expect(isDetailPath(`${origin}/member-management/advertiser`, `${origin}/dashboard`)).toBe(false);
    expect(isDataRowText("1 Rejected MOAD PT Test 2026-11-04")).toBe(true);
    expect(isDataRowText("NO. Status Company name Email")).toBe(false);
    expect(isDataRowText("NO Category Type Post Title Registration Date")).toBe(false);
    expect(isDetailActionName("View")).toBe(true);
    expect(isDetailActionName("View details")).toBe(true);
    expect(isDetailActionName("Details")).toBe(true);
    expect(isDetailActionName("Delete")).toBe(false);
    expect(isActionMenuName("Actions")).toBe(true);
    expect(isActionMenuName("View")).toBe(false);
  });
});

describe("page load classification", () => {
  it("marks a rendered page as loaded and an error page as failed", () => {
    expect(
      classifyPageLoad({
        httpStatus: 200,
        title: "Dashboard",
        text: "Dashboard Campaigns Create Campaign The workspace is ready for a new campaign.",
      }).status,
    ).toBe("loaded");

    expect(
      classifyPageLoad({
        httpStatus: 500,
        title: "Error",
        text: "Internal server error while rendering this page for the visitor.",
      }),
    ).toEqual({ status: "failed", detail: "Failed to load" });

    expect(
      classifyPageLoad({
        httpStatus: 200,
        title: "Not found",
        text: "This page could not be found.",
      }).status,
    ).toBe("failed");
  });
});
