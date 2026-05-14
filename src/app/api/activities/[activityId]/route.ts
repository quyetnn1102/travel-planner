import { ParamsContext, fail, ok, readJson } from "@/server/api-response";
import { deleteActivity, patchActivity } from "@/server/travel-store";

type ActivityContext = ParamsContext<{ activityId: string }>;

export async function PATCH(request: Request, context: ActivityContext) {
  const { activityId } = await context.params;
  const body = await readJson(request);
  const activity = patchActivity(activityId, body);

  return activity ? ok(activity) : fail("NOT_FOUND", "Activity not found.", 404);
}

export async function DELETE(_request: Request, context: ActivityContext) {
  const { activityId } = await context.params;
  const deleted = deleteActivity(activityId);

  return deleted ? ok({ deleted: true }) : fail("NOT_FOUND", "Activity not found.", 404);
}
