import { ok } from "@/server/api-response";
import { getCurrentUser } from "@/server/auth";

export async function GET() {
  return ok(await getCurrentUser());
}
