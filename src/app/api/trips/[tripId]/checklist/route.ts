import { ParamsContext, fail, failFromError, ok, readJson } from "@/server/api-response";
import { addChecklistItem, listChecklist } from "@/server/travel-store";
import { parseChecklistInput } from "@/server/validation/checklist";

type TripContext = ParamsContext<{ tripId: string }>;

export async function GET(_request: Request, context: TripContext) {
  const { tripId } = await context.params;
  try {
    const checklist = await listChecklist(tripId);

    return checklist ? ok(checklist) : fail("NOT_FOUND", "Trip not found.", 404);
  } catch (error) {
    return failFromError(error, "Could not load checklist.");
  }
}

export async function POST(request: Request, context: TripContext) {
  const { tripId } = await context.params;
  const body = await readJson(request);

  try {
    const item = await addChecklistItem(tripId, parseChecklistInput(body));
    return item ? ok(item, { status: 201 }) : fail("NOT_FOUND", "Trip not found.", 404);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthenticationError") {
      return failFromError(error);
    }

    return fail("BAD_REQUEST", error instanceof Error ? error.message : "Invalid checklist payload.");
  }
}
