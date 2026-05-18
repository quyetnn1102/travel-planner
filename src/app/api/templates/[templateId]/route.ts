import { ParamsContext, fail, ok } from "@/server/api-response";
import { tripTemplates } from "@/lib/trip-templates";

type TemplateContext = ParamsContext<{ templateId: string }>;

export function GET(_request: Request, context: TemplateContext) {
  return context.params.then(({ templateId }) => {
    const template = tripTemplates.find((item) => item.id === templateId);
    return template ? ok(template) : fail("NOT_FOUND", "Template not found.", 404);
  });
}
