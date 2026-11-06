import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ant Design generates style identifiers during server render. Cache Components
  // rejects that non-deterministic render, so the app uses dynamic rendering.
  cacheComponents: false,
  partialPrefetching: false,
  serverExternalPackages: ["playwright"],
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
