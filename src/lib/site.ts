export const siteName = "AI QA Assistant";
export const siteDescription = "Generate test cases and check whether each page on a site loads.";

export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
