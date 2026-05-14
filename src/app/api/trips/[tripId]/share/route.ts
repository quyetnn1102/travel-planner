import { ParamsContext, fail, ok, readJson } from "@/server/api-response";
import { enableShare, patchShare } from "@/server/travel-store";

type TripContext = ParamsContext<{ tripId: string }>;

export async function POST(_request: Request, context: TripContext) {
  const { tripId } = await context.params;
  const share = await enableShare(tripId);

  return share ? ok(share, { status: 201 }) : fail("NOT_FOUND", "Trip not found.", 404);
}

export async function PATCH(request: Request, context: TripContext) {
  const { tripId } = await context.params;
  const body = await readJson(request);
  const share = await patchShare(tripId, body);

  return share ? ok(share) : fail("NOT_FOUND", "Trip not found.", 404);
}
