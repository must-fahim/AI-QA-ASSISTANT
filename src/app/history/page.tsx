import type { Metadata } from "next";
import { HistoryView } from "@/components/history/HistoryView";

export const metadata: Metadata = { title: "Test History · AI QA Assistant" };

export default function HistoryPage() {
  return <HistoryView />;
}
