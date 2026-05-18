import { ParamsContext, fail, failFromError, ok, readJson } from "@/server/api-response";
import { reorderActivities } from "@/server/travel-store";

type DayContext = ParamsContext<{ dayId: string }>;

async function handleReorder(request: Request, context: DayContext) {
  const { dayId } = await context.params;
  const body = await readJson(request);
  try {
    const activities = await reorderActivities(dayId, body);

    return activities ? ok(activities) : fail("BAD_REQUEST", "Invalid reorder payload.", 400);
  } catch (error) {
    return failFromError(error, "Invalid reorder payload.");
  }
}

export async function PATCH(request: Request, context: DayContext) {
  return handleReorder(request, context);
}

export async function POST(request: Request, context: DayContext) {
  return handleReorder(request, context);
}
