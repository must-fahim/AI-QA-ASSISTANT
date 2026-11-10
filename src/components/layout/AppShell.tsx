"use client";

import { AccountMenu } from "@/components/layout/AccountMenu";
import { ModelSelect } from "@/components/layout/ModelSelect";
import { Button, Layout, Menu } from "antd";
import {
  History,
  Bookmark,
  LayoutDashboard,
  Menu as MenuIcon,
  ScanSearch,
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
  { href: "/page-check", label: "Page Check", icon: ScanSearch },
  { href: "/saved-tests", label: "Saved Tests", icon: Bookmark },
  { href: "/history", label: "Test History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/generate": "Generate Test Cases",
  "/page-check": "Page Check",
  "/saved-tests": "Saved Tests",
  "/history": "Test History",
  "/settings": "Settings",
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const selected = pathname.startsWith("/history")
    ? "/history"
    : pathname.startsWith("/saved-tests")
      ? "/saved-tests"
      : NAVIGATION.some((item) => item.href === pathname)
        ? pathname
        : "/dashboard";
  if (pathname === "/login") return <div className="min-h-dvh bg-[#f5f5f7]">{children}</div>;

  const title = pathname.startsWith("/history/")
    ? "Test suite"
    : pathname.endsWith("/edit")
      ? "Edit saved test"
      : pathname.startsWith("/saved-tests/")
        ? "Saved test"
        : (TITLES[selected] ?? "AI QA Assistant");

  return (
    <Layout className="h-dvh overflow-hidden bg-[#f5f5f7]">
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
        className="h-dvh overflow-x-hidden overflow-y-auto border-r border-[#e5e7eb]"
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-[#eeeef2] px-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#712DC8] text-[11px] font-bold tracking-wide text-white">
            QA
          </span>
          <div className="min-w-0">
            <p className="m-0 truncate text-[13px] font-semibold leading-4 text-[#1c1c1c]">AI QA Assistant</p>
            <p className="m-0 truncate text-[11px] leading-4 text-[#8b8b95]">Test case studio</p>
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
      <Layout className="min-h-0 bg-[#f5f5f7]">
        <Header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white px-4 !leading-normal md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="text"
              className="lg:!hidden"
              aria-label={collapsed ? "Open navigation" : "Close navigation"}
              icon={<MenuIcon size={18} />}
              onClick={() => setCollapsed((current) => !current)}
            />
            <h1 className="m-0 truncate text-base font-semibold leading-5 whitespace-nowrap text-[#1c1c1c]">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <ModelSelect />
            <AccountMenu />
          </div>
        </Header>
        <Content className="stable-scrollbar overflow-y-auto p-4 md:p-6">{children}</Content>
      </Layout>
    </Layout>
  );
}
