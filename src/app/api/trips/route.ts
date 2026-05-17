import { fail, ok, readJson } from "@/server/api-response";
import { toClientErrorMessage } from "@/server/errors";
import { createTrip, listTrips } from "@/server/travel-store";
import { parseTripDraftInput } from "@/server/validation/trip";

export async function GET() {
  return ok(await listTrips());
}

export async function POST(request: Request) {
  const body = await readJson(request);

  try {
    const trip = await createTrip(parseTripDraftInput(body));
    return ok(trip, { status: 201 });
  } catch (error) {
    return fail("BAD_REQUEST", toClientErrorMessage(error, "Invalid trip payload."));
  }
}
