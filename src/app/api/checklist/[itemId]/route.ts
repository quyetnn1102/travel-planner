import { ParamsContext, fail, failFromError, ok, readJson } from "@/server/api-response";
import { deleteChecklistItem, patchChecklistItem } from "@/server/travel-store";
import { parseChecklistInput } from "@/server/validation/checklist";

type ChecklistContext = ParamsContext<{ itemId: string }>;

export async function PATCH(request: Request, context: ChecklistContext) {
  const { itemId } = await context.params;
  const body = await readJson(request);
  try {
    const item = await patchChecklistItem(itemId, parseChecklistInput(body));

    return item ? ok(item) : fail("NOT_FOUND", "Checklist item not found.", 404);
  } catch (error) {
    return failFromError(error, "Invalid checklist payload.");
  }
}

export async function DELETE(_request: Request, context: ChecklistContext) {
  const { itemId } = await context.params;
  try {
    const deleted = await deleteChecklistItem(itemId);

    return deleted ? ok({ deleted: true }) : fail("NOT_FOUND", "Checklist item not found.", 404);
  } catch (error) {
    return failFromError(error, "Could not delete checklist item.");
  }
}
