import { ParamsContext, fail, ok, readJson } from "@/server/api-response";
import { deleteTrip, getTrip, updateTrip } from "@/server/travel-store";

type TripContext = ParamsContext<{ tripId: string }>;

export async function GET(_request: Request, context: TripContext) {
  const { tripId } = await context.params;
  const trip = getTrip(tripId);

  return trip ? ok(trip) : fail("NOT_FOUND", "Trip not found.", 404);
}

export async function PATCH(request: Request, context: TripContext) {
  const { tripId } = await context.params;
  const body = await readJson(request);
  const trip = updateTrip(tripId, body);

  return trip ? ok(trip) : fail("NOT_FOUND", "Trip not found.", 404);
}

export async function DELETE(_request: Request, context: TripContext) {
  const { tripId } = await context.params;
  const deleted = deleteTrip(tripId);

  return deleted ? ok({ deleted: true }) : fail("NOT_FOUND", "Trip not found.", 404);
}
