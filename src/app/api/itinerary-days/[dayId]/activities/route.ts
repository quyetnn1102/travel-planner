import { ParamsContext, fail, ok, readJson } from "@/server/api-response";
import { addActivity } from "@/server/travel-store";

type DayContext = ParamsContext<{ dayId: string }>;

export async function POST(request: Request, context: DayContext) {
  const { dayId } = await context.params;
  const body = await readJson(request);

  try {
    const activity = addActivity(dayId, body);
    return activity ? ok(activity, { status: 201 }) : fail("NOT_FOUND", "Itinerary day not found.", 404);
  } catch (error) {
    return fail("BAD_REQUEST", error instanceof Error ? error.message : "Invalid activity payload.");
  }
}
