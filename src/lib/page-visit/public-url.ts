import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { AppError } from "@/lib/errors";

export async function assertPublicHttpUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AppError("Enter a valid http or https page URL.", 400, "INVALID_PAGE_URL");
  }

  if (url.username || url.password) {
    throw new AppError("Put the login in the email and password fields, not in the URL.", 400, "INVALID_PAGE_URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AppError("The page URL must start with http:// or https://.", 400, "INVALID_PAGE_URL");
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (isBlockedHost(host) || (isIP(host) && isPrivateAddress(host))) {
    throw new AppError("The page URL must be a public website.", 400, "INVALID_PAGE_URL");
  }

  if (!isIP(host)) {
    let records: Array<{ address: string }>;
    try {
      records = await lookup(host, { all: true });
    } catch {
      throw new AppError("The page address could not be resolved.", 400, "INVALID_PAGE_URL");
    }
    if (records.length === 0 || records.some((record) => isPrivateAddress(record.address))) {
      throw new AppError("The page URL must be a public website.", 400, "INVALID_PAGE_URL");
    }
  }

  return url;
}

function isBlockedHost(host: string) {
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]"
  );
}

export function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "::1" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  const parts = normalized.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [first, second] = parts;
  return (
    first === 10 ||
    first === 127 ||
    first === 0 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127)
  );
}
