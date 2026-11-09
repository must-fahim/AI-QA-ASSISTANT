import type { Metadata } from "next";
import { GenerateView } from "@/components/generate/GenerateView";

export const metadata: Metadata = { title: "Generate Test Cases" };

export default function GeneratePage() {
  return <GenerateView />;
}
