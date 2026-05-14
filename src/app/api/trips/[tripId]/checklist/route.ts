import { ParamsContext, fail, ok, readJson } from "@/server/api-response";
import { addChecklistItem, listChecklist } from "@/server/travel-store";

type TripContext = ParamsContext<{ tripId: string }>;

export async function GET(_request: Request, context: TripContext) {
  const { tripId } = await context.params;
  const checklist = listChecklist(tripId);

  return checklist ? ok(checklist) : fail("NOT_FOUND", "Trip not found.", 404);
}

export async function POST(request: Request, context: TripContext) {
  const { tripId } = await context.params;
  const body = await readJson(request);

  try {
    const item = addChecklistItem(tripId, body);
    return item ? ok(item, { status: 201 }) : fail("NOT_FOUND", "Trip not found.", 404);
  } catch (error) {
    return fail("BAD_REQUEST", error instanceof Error ? error.message : "Invalid checklist payload.");
  }
}
