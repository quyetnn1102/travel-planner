import { ParamsContext, fail, ok, readJson } from "@/server/api-response";
import { reorderActivities } from "@/server/travel-store";

type DayContext = ParamsContext<{ dayId: string }>;

async function handleReorder(request: Request, context: DayContext) {
  const { dayId } = await context.params;
  const body = await readJson(request);
  const activities = await reorderActivities(dayId, body);

  return activities ? ok(activities) : fail("BAD_REQUEST", "Invalid reorder payload.", 400);
}

export async function PATCH(request: Request, context: DayContext) {
  return handleReorder(request, context);
}

export async function POST(request: Request, context: DayContext) {
  return handleReorder(request, context);
}
