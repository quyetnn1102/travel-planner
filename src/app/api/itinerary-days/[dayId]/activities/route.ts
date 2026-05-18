import { ParamsContext, fail, failFromError, ok, readJson } from "@/server/api-response";
import { addActivity } from "@/server/travel-store";
import { parseActivityInput } from "@/server/validation/activity";

type DayContext = ParamsContext<{ dayId: string }>;

export async function POST(request: Request, context: DayContext) {
  const { dayId } = await context.params;
  const body = await readJson(request);

  try {
    const activity = await addActivity(dayId, parseActivityInput(body));
    return activity ? ok(activity, { status: 201 }) : fail("NOT_FOUND", "Itinerary day not found.", 404);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthenticationError") {
      return failFromError(error);
    }

    return fail("BAD_REQUEST", error instanceof Error ? error.message : "Invalid activity payload.");
  }
}
