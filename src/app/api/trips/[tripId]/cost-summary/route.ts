import { ParamsContext, fail, failFromError, ok } from "@/server/api-response";
import { getCostSummary } from "@/server/travel-store";

type TripContext = ParamsContext<{ tripId: string }>;

export async function GET(_request: Request, context: TripContext) {
  const { tripId } = await context.params;
  try {
    const summary = await getCostSummary(tripId);

    return summary ? ok(summary) : fail("NOT_FOUND", "Trip not found.", 404);
  } catch (error) {
    return failFromError(error, "Could not load cost summary.");
  }
}
