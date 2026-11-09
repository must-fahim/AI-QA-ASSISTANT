import { ImageResponse } from "next/og";
import { siteDescription, siteName } from "@/lib/site";

export const alt = `${siteName}. ${siteDescription}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f5f5f7",
          padding: 48,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            background: "white",
            borderRadius: 28,
            border: "1px solid #e5e7eb",
            padding: "64px 72px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 24,
                background: "#712DC8",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                fontWeight: 700,
              }}
            >
              QA
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 28 }}>
              <div style={{ fontSize: 24, color: "#7c6a90" }}>Test case studio</div>
              <div style={{ fontSize: 64, fontWeight: 700, color: "#1c1c1c", marginTop: 6 }}>{siteName}</div>
            </div>
          </div>
          <div style={{ fontSize: 36, lineHeight: 1.35, color: "#374151", maxWidth: 860 }}>{siteDescription}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
