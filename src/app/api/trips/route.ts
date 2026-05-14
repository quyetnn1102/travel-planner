import { fail, ok, readJson } from "@/server/api-response";
import { createTrip, listTrips } from "@/server/travel-store";

export async function GET() {
  return ok(await listTrips());
}

export async function POST(request: Request) {
  const body = await readJson(request);

  try {
    const trip = await createTrip(body);
    return ok(trip, { status: 201 });
  } catch (error) {
    return fail("BAD_REQUEST", error instanceof Error ? error.message : "Invalid trip payload.");
  }
}
