import { ParamsContext, fail, failFromError, ok, readJson } from "@/server/api-response";
import { enableShare, patchShare } from "@/server/travel-store";
import { parseShareUpdateInput } from "@/server/validation/share";

type TripContext = ParamsContext<{ tripId: string }>;

export async function POST(_request: Request, context: TripContext) {
  const { tripId } = await context.params;
  try {
    const share = await enableShare(tripId);

    return share ? ok(share, { status: 201 }) : fail("NOT_FOUND", "Trip not found.", 404);
  } catch (error) {
    return failFromError(error, "Could not enable share link.");
  }
}

export async function PATCH(request: Request, context: TripContext) {
  const { tripId } = await context.params;
  const body = await readJson(request);
  try {
    const share = await patchShare(tripId, parseShareUpdateInput(body));

    return share ? ok(share) : fail("NOT_FOUND", "Trip not found.", 404);
  } catch (error) {
    return failFromError(error, "Could not update share link.");
  }
}
