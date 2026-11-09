import { jsonData, withErrorHandling } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  return jsonData(await requireUser());
});
