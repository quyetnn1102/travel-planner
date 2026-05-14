import { fail, ok, readJson } from "@/server/api-response";
import { createTrip, listTrips } from "@/server/travel-store";

export function GET() {
  return ok(listTrips());
}

export async function POST(request: Request) {
  const body = await readJson(request);

  try {
    const trip = createTrip(body);
    return ok(trip, { status: 201 });
  } catch (error) {
    return fail("BAD_REQUEST", error instanceof Error ? error.message : "Invalid trip payload.");
  }
}
