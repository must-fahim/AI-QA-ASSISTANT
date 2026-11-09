import type { Metadata } from "next";
import { SuiteDetailView } from "@/components/history/SuiteDetailView";

export const metadata: Metadata = { title: "Test suite" };

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SuiteDetailView id={id} />;
}
