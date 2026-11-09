import type { NextConfig } from "next";

const chromiumPackage = [
  "./node_modules/@sparticuz/chromium/bin/**",
  "./node_modules/@sparticuz/chromium/build/**",
  "./node_modules/@sparticuz/chromium/package.json",
];

const nextConfig: NextConfig = {
  // Ant Design generates style identifiers during server render. Cache Components
  // rejects that non-deterministic render, so the app uses dynamic rendering.
  cacheComponents: false,
  partialPrefetching: false,
  serverExternalPackages: ["playwright", "playwright-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/page-check": chromiumPackage,
    "/api/**/retest": chromiumPackage,
    "/api/generate": chromiumPackage,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
