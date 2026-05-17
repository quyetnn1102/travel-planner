import { ParamsContext, fail, ok, readJson } from "@/server/api-response";
import { toClientErrorMessage } from "@/server/errors";
import { deleteTrip, getTrip, updateTrip } from "@/server/travel-store";
import { parseTripDraftInput } from "@/server/validation/trip";

type TripContext = ParamsContext<{ tripId: string }>;

export async function GET(_request: Request, context: TripContext) {
  const { tripId } = await context.params;
  const trip = await getTrip(tripId);

  return trip ? ok(trip) : fail("NOT_FOUND", "Trip not found.", 404);
}

export async function PATCH(request: Request, context: TripContext) {
  const { tripId } = await context.params;
  const body = await readJson(request);

  try {
    const trip = await updateTrip(tripId, parseTripDraftInput(body));
    return trip ? ok(trip) : fail("NOT_FOUND", "Trip not found.", 404);
  } catch (error) {
    return fail("BAD_REQUEST", toClientErrorMessage(error, "Invalid trip payload."));
  }
}

export async function DELETE(_request: Request, context: TripContext) {
  const { tripId } = await context.params;
  const deleted = await deleteTrip(tripId);

  return deleted ? ok({ deleted: true }) : fail("NOT_FOUND", "Trip not found.", 404);
}
