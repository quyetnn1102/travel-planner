import { ParamsContext, fail, ok } from "@/server/api-response";
import { toPublicTripDto } from "@/server/public-trip";
import { getSharedTrip } from "@/server/travel-store";

type ShareContext = ParamsContext<{ shareToken: string }>;

export async function GET(_request: Request, context: ShareContext) {
  const { shareToken } = await context.params;
  const trip = await getSharedTrip(shareToken);

  return trip ? ok(toPublicTripDto(trip)) : fail("NOT_FOUND", "Shared trip not found.", 404);
}
