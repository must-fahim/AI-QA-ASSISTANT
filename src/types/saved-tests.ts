import type { SavedPageSource, SavedPageStatus } from "@/lib/saved-tests/pages";

export interface SavedPageRecord {
  id: string;
  name: string;
  url: string;
  source: SavedPageSource;
  lastStatus: SavedPageStatus | null;
  position: number;
}

export interface SavedTestRecord {
  id: string;
  name: string;
  siteUrl: string;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
  lastTestedAt: string | null;
  pages: SavedPageRecord[];
}

export interface SavedTestSummary {
  id: string;
  name: string;
  siteUrl: string;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
  lastTestedAt: string | null;
}
