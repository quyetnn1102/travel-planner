import { ParamsContext, fail, ok, readJson } from "@/server/api-response";
import { deleteChecklistItem, patchChecklistItem } from "@/server/travel-store";

type ChecklistContext = ParamsContext<{ itemId: string }>;

export async function PATCH(request: Request, context: ChecklistContext) {
  const { itemId } = await context.params;
  const body = await readJson(request);
  const item = await patchChecklistItem(itemId, body);

  return item ? ok(item) : fail("NOT_FOUND", "Checklist item not found.", 404);
}

export async function DELETE(_request: Request, context: ChecklistContext) {
  const { itemId } = await context.params;
  const deleted = await deleteChecklistItem(itemId);

  return deleted ? ok({ deleted: true }) : fail("NOT_FOUND", "Checklist item not found.", 404);
}
