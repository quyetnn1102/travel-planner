import { ParamsContext, fail, failFromError, ok, readJson } from "@/server/api-response";
import { tripTemplates, templateToDraft } from "@/lib/trip-templates";
import { addActivity, addChecklistItem, addCost, createTrip } from "@/server/travel-store";

type TemplateContext = ParamsContext<{ templateId: string }>;

type UseTemplateRequest = {
  startDate?: string;
};

export async function POST(request: Request, context: TemplateContext) {
  const { templateId } = await context.params;
  const body = (await readJson<UseTemplateRequest>(request)) ?? {};
  const template = tripTemplates.find((item) => item.id === templateId);

  if (!template) {
    return fail("NOT_FOUND", "Template not found.", 404);
  }

  try {
    const trip = await createTrip(templateToDraft(template, body.startDate ?? nextMonthDate()));

    for (const dayTemplate of template.days) {
      const day = trip.itineraryDays.find((item) => item.dayNumber === dayTemplate.dayNumber);

      if (!day) {
        continue;
      }

      for (const activity of dayTemplate.activities) {
        await addActivity(day.id, {
          title: activity.title,
          timeBlock: activity.timeBlock,
          startTime: "",
          endTime: "",
          locationName: activity.locationName,
          address: "",
          estimatedCost: activity.estimatedCost,
          notes: activity.notes,
        });
      }
    }

    for (const cost of template.costItems) {
      await addCost(trip.id, cost);
    }

    for (const item of template.checklistItems) {
      await addChecklistItem(trip.id, {
        title: item.title,
        category: item.category,
        isDone: false,
      });
    }

    return ok({ tripId: trip.id }, { status: 201 });
  } catch (error) {
    return failFromError(error, "Could not create trip from template.");
  }
}

function nextMonthDate() {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}
