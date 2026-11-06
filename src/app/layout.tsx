import type { Metadata } from "next";
import { Suspense } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { AppProviders } from "@/components/providers/AppProviders";
import "antd/dist/reset.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI QA Assistant",
  description: "Generate, review, and export software test cases from requirements.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AntdRegistry>
          <AppProviders>
            <Suspense fallback={<div className="min-h-screen bg-[#f5f5f7]" />}>
              <AppShell>{children}</AppShell>
            </Suspense>
          </AppProviders>
        </AntdRegistry>
      </body>
    </html>
  );
}
