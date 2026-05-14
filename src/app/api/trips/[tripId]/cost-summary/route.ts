import { ParamsContext, fail, ok } from "@/server/api-response";
import { getCostSummary } from "@/server/travel-store";

type TripContext = ParamsContext<{ tripId: string }>;

export async function GET(_request: Request, context: TripContext) {
  const { tripId } = await context.params;
  const summary = getCostSummary(tripId);

  return summary ? ok(summary) : fail("NOT_FOUND", "Trip not found.", 404);
}
