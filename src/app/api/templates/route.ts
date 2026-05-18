import { ok } from "@/server/api-response";
import { tripTemplates } from "@/lib/trip-templates";

export function GET() {
  return ok(
    tripTemplates.map(({ days, costItems, checklistItems, ...template }) => ({
      ...template,
      dayCount: days.length,
      costItemCount: costItems.length,
      checklistItemCount: checklistItems.length,
    })),
  );
}
