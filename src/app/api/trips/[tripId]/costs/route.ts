import { ParamsContext, fail, failFromError, ok, readJson } from "@/server/api-response";
import { addCost, listCosts } from "@/server/travel-store";
import { parseCostInput } from "@/server/validation/cost";

type TripContext = ParamsContext<{ tripId: string }>;

export async function GET(_request: Request, context: TripContext) {
  const { tripId } = await context.params;
  try {
    const costs = await listCosts(tripId);

    return costs ? ok(costs) : fail("NOT_FOUND", "Trip not found.", 404);
  } catch (error) {
    return failFromError(error, "Could not load costs.");
  }
}

export async function POST(request: Request, context: TripContext) {
  const { tripId } = await context.params;
  const body = await readJson(request);

  try {
    const cost = await addCost(tripId, parseCostInput(body));
    return cost ? ok(cost, { status: 201 }) : fail("NOT_FOUND", "Trip not found.", 404);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthenticationError") {
      return failFromError(error);
    }

    return fail("BAD_REQUEST", error instanceof Error ? error.message : "Invalid cost payload.");
  }
}
