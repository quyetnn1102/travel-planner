import { ParamsContext, fail, failFromError, ok, readJson } from "@/server/api-response";
import { deleteActivity, patchActivity } from "@/server/travel-store";
import { parseActivityInput } from "@/server/validation/activity";

type ActivityContext = ParamsContext<{ activityId: string }>;

export async function PATCH(request: Request, context: ActivityContext) {
  const { activityId } = await context.params;
  const body = await readJson(request);
  try {
    const activity = await patchActivity(activityId, parseActivityInput(body));

    return activity ? ok(activity) : fail("NOT_FOUND", "Activity not found.", 404);
  } catch (error) {
    return failFromError(error, "Invalid activity payload.");
  }
}

export async function DELETE(_request: Request, context: ActivityContext) {
  const { activityId } = await context.params;
  try {
    const deleted = await deleteActivity(activityId);

    return deleted ? ok({ deleted: true }) : fail("NOT_FOUND", "Activity not found.", 404);
  } catch (error) {
    return failFromError(error, "Could not delete activity.");
  }
}
