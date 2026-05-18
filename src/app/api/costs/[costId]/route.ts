import { ParamsContext, fail, failFromError, ok, readJson } from "@/server/api-response";
import { deleteCost, patchCost } from "@/server/travel-store";
import { parseCostInput } from "@/server/validation/cost";

type CostContext = ParamsContext<{ costId: string }>;

export async function PATCH(request: Request, context: CostContext) {
  const { costId } = await context.params;
  const body = await readJson(request);
  try {
    const cost = await patchCost(costId, parseCostInput(body));

    return cost ? ok(cost) : fail("NOT_FOUND", "Cost item not found.", 404);
  } catch (error) {
    return failFromError(error, "Invalid cost payload.");
  }
}

export async function DELETE(_request: Request, context: CostContext) {
  const { costId } = await context.params;
  try {
    const deleted = await deleteCost(costId);

    return deleted ? ok({ deleted: true }) : fail("NOT_FOUND", "Cost item not found.", 404);
  } catch (error) {
    return failFromError(error, "Could not delete cost item.");
  }
}
