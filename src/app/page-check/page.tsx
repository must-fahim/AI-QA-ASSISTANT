import type { Metadata } from "next";
import { PageCheckView } from "@/components/page-check/PageCheckView";

export const metadata: Metadata = { title: "Page Check" };

export default function PageCheckPage() {
  return <PageCheckView />;
}
