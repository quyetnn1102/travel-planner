import { ok } from "@/server/api-response";

export function GET() {
  return ok({
    id: "dev-user",
    name: "Demo User",
    email: "demo@example.com",
    authMode: "development-stub",
  });
}
