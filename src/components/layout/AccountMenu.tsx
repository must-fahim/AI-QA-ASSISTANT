"use client";

import { Dropdown } from "antd";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiClientError, apiFetch } from "@/lib/api/client";

interface CurrentUser {
  name: string;
  email: string;
  avatarUrl: string | null;
}

export function AccountMenu() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<CurrentUser>("/api/auth/me")
      .then((next) => {
        if (active) setUser(next);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiClientError && error.status === 401) {
          window.location.href = "/login";
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const name = user?.name ?? "Account";
  const email = user?.email ?? "Google account";

  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: [
          {
            key: "sign-out",
            icon: <LogOut size={16} />,
            label: "Sign out",
            onClick: () => void signOut(),
          },
        ],
      }}
    >
      <button type="button" className="flex items-center gap-2 rounded-full bg-[#f6f1fb] py-1 pr-1 pl-3">
        <span className="hidden text-right sm:block">
          <span className="block text-[13px] font-semibold leading-4 text-[#1c1c1c]">{name}</span>
          <span className="block max-w-40 truncate text-[11px] leading-4 text-[#7c6a90]">{email}</span>
        </span>
        <Avatar name={name} url={user?.avatarUrl ?? null} />
      </button>
    </Dropdown>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return <img src={url} alt="" className="h-8 w-8 rounded-full object-cover" />;
  }
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#712DC8] text-[11px] font-semibold text-white">
      {initials || "QA"}
    </span>
  );
}
