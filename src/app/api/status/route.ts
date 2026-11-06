import { AppError } from "@/lib/errors";
import { jsonData, withErrorHandling } from "@/lib/api/http";
import { readPublicStatus } from "@/lib/config";
import { isDatabaseConfigured } from "@/lib/supabase/server";
import { pingDatabase } from "@/repositories/test-suites/test-suite.repository";

export const GET = withErrorHandling(async (request: Request) => {
  const pathname = new URL(request.url).pathname;
  if (!pathname) {
    throw new AppError("Request URL is missing.", 400, "INVALID_REQUEST");
  }

  if (!isDatabaseConfigured()) {
    return jsonData(readPublicStatus());
  }

  try {
    const database = await pingDatabase();
    return jsonData(readPublicStatus(database));
  } catch (error) {
    if (error instanceof AppError && error.code === "DATABASE_NOT_CONFIGURED") {
      return jsonData(readPublicStatus());
    }
    const message =
      error instanceof AppError
        ? error.message
        : "The server could not query Supabase. Check the project URL, service role key, and migration.";
    return jsonData(readPublicStatus({ reachable: false, message }));
  }
});
