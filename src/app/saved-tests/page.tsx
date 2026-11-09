import type { Metadata } from "next";
import { SavedTestsView } from "@/components/saved-tests/SavedTestsView";

export const metadata: Metadata = { title: "Saved Tests" };

export default function SavedTestsPage() {
  return <SavedTestsView />;
}
