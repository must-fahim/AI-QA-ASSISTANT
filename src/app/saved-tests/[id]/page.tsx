import type { Metadata } from "next";
import { SavedTestDetailView } from "@/components/saved-tests/SavedTestDetailView";

export const metadata: Metadata = { title: "Saved test · AI QA Assistant" };

export default function SavedTestPage() {
  return <SavedTestDetailView />;
}
