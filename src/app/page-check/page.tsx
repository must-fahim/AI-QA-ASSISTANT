import type { Metadata } from "next";
import { PageCheckView } from "@/components/page-check/PageCheckView";

export const metadata: Metadata = { title: "Page Check · AI QA Assistant" };

export default function PageCheckPage() {
  return <PageCheckView />;
}
