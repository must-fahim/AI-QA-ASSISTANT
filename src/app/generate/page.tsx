import type { Metadata } from "next";
import { GenerateView } from "@/components/generate/GenerateView";

export const metadata: Metadata = { title: "Generate Test Cases · AI QA Assistant" };

export default function GeneratePage() {
  return <GenerateView />;
}
