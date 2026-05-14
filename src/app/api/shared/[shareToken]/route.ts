import { ParamsContext, fail, ok } from "@/server/api-response";
import { getSharedTrip } from "@/server/travel-store";

type ShareContext = ParamsContext<{ shareToken: string }>;

export async function GET(_request: Request, context: ShareContext) {
  const { shareToken } = await context.params;
  const trip = getSharedTrip(shareToken);

  return trip ? ok(trip) : fail("NOT_FOUND", "Shared trip not found.", 404);
}
