"use client";

import { App, ConfigProvider } from "antd";
import { useEffect, useState, type ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function AppProviders({ children }: { children: ReactNode }) {
  const [toastsReady, setToastsReady] = useState(false);
  useEffect(() => {
    setToastsReady(true);
  }, []);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#712DC8",
          colorInfo: "#712DC8",
          colorLink: "#712DC8",
          borderRadius: 8,
          colorBorder: "#e5e7eb",
          colorBgLayout: "#f5f5f7",
          colorText: "#1c1c1c",
          fontFamily: "var(--font-geist-sans), sans-serif",
        },
        components: {
          Layout: {
            headerBg: "#ffffff",
            siderBg: "#ffffff",
            bodyBg: "#f5f5f7",
            headerHeight: 64,
            headerPadding: "0 20px",
          },
          Menu: {
            itemSelectedBg: "#f4edfb",
            itemSelectedColor: "#712DC8",
            itemHoverBg: "#faf7fd",
          },
          Card: {
            headerBg: "#ffffff",
          },
        },
      }}
    >
      <App>
        {toastsReady ? (
          <ToastContainer position="top-right" style={{ top: 12, zIndex: 12000 }} />
        ) : null}
        {children}
      </App>
    </ConfigProvider>
  );
}
