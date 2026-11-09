import type { Metadata } from "next";
import { HistoryView } from "@/components/history/HistoryView";

export const metadata: Metadata = { title: "Test History" };

export default function HistoryPage() {
  return <HistoryView />;
}
