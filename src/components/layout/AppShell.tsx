"use client";

import { ModelSelect } from "@/components/layout/ModelSelect";
import { Button, Layout, Menu } from "antd";
import {
  History,
  LayoutDashboard,
  Menu as MenuIcon,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const { Sider, Header, Content } = Layout;

const NAVIGATION: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/generate", label: "Generate Test Cases", icon: Sparkles },
  { href: "/history", label: "Test History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/generate": "Generate Test Cases",
  "/history": "Test History",
  "/settings": "Settings",
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const selected = pathname.startsWith("/history")
    ? "/history"
    : NAVIGATION.some((item) => item.href === pathname)
      ? pathname
      : "/dashboard";
  const title = pathname.startsWith("/history/") ? "Test suite" : (TITLES[selected] ?? "AI QA Assistant");

  return (
    <Layout className="min-h-screen bg-[#f5f5f7]">
      <Sider
        breakpoint="lg"
        collapsedWidth={0}
        width={248}
        theme="light"
        trigger={null}
        collapsed={collapsed}
        onBreakpoint={(broken) => {
          setMobile(broken);
          setCollapsed(broken);
        }}
        className="border-r border-[#e5e7eb]"
      >
        <div className="flex h-16 items-center gap-3 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#712DC8] text-xs font-semibold text-white">
            QA
          </span>
          <div>
            <p className="text-sm font-semibold leading-4 text-[#1c1c1c]">AI QA Assistant</p>
            <p className="text-xs text-[#6b7280]">Test case studio</p>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selected]}
          items={NAVIGATION.map((item) => ({
            key: item.href,
            icon: <item.icon size={16} aria-hidden />,
            label: <Link href={item.href}>{item.label}</Link>,
          }))}
          className="border-none"
          onClick={() => {
            if (mobile) setCollapsed(true);
          }}
        />
      </Sider>
      <Layout>
        <Header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#e5e7eb] bg-white">
          <div className="flex items-center gap-2">
            <Button
              type="text"
              className="lg:!hidden"
              aria-label={collapsed ? "Open navigation" : "Close navigation"}
              icon={<MenuIcon size={18} />}
              onClick={() => setCollapsed((current) => !current)}
            />
            <h1 className="m-0 text-base font-semibold text-[#1c1c1c]">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <ModelSelect />
            <div className="text-right leading-4">
              <p className="text-sm font-medium text-[#1c1c1c]">QA Engineer</p>
              <p className="text-xs text-[#6b7280]">Local workspace</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4edfb] text-xs font-semibold text-[#712DC8]">
              QA
            </span>
          </div>
        </Header>
        <Content className="p-4 md:p-6">{children}</Content>
      </Layout>
    </Layout>
  );
}
