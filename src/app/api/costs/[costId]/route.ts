import { ParamsContext, fail, ok, readJson } from "@/server/api-response";
import { deleteCost, patchCost } from "@/server/travel-store";

type CostContext = ParamsContext<{ costId: string }>;

export async function PATCH(request: Request, context: CostContext) {
  const { costId } = await context.params;
  const body = await readJson(request);
  const cost = patchCost(costId, body);

  return cost ? ok(cost) : fail("NOT_FOUND", "Cost item not found.", 404);
}

export async function DELETE(_request: Request, context: CostContext) {
  const { costId } = await context.params;
  const deleted = deleteCost(costId);

  return deleted ? ok({ deleted: true }) : fail("NOT_FOUND", "Cost item not found.", 404);
}
