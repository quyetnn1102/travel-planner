import { fail, ok, readJson } from "@/server/api-response";
import { generateOpenAIJson, toAiErrorResponse } from "@/server/ai/openai";
import { ValidationError } from "@/server/errors";
import { assertRateLimit } from "@/server/rate-limit";
import { addActivitiesToDays, getTrip } from "@/server/travel-store";
import { z } from "zod";

type GenerateRequest = {
  tripId?: string;
};

const activityInputSchema = z.object({
  title: z.string().min(1),
  timeBlock: z.enum(["morning", "noon", "afternoon", "evening"]),
  startTime: z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/).optional(),
  locationName: z.string().optional(),
  estimatedCost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

const generateResponseSchema = z.object({
  days: z.array(
    z.object({
      dayNumber: z.number().int().min(1),
      activities: z.array(activityInputSchema).min(1),
    }),
  ),
});

export async function POST(request: Request) {
  const body = (await readJson<GenerateRequest>(request)) ?? {};

  try {
    assertRateLimit(request, "ai:generate-itinerary", 5);

    if (!body.tripId) {
      throw new ValidationError("Trip id is required.");
    }

    const trip = await getTrip(body.tripId);

    if (!trip) {
      return fail("NOT_FOUND", "Trip not found.", 404);
    }

    const generated = await generateOpenAIJson({
      schema: generateResponseSchema,
      maxOutputTokens: 3000,
      instructions:
        'You are a practical travel planner for Vietnamese travelers. Return only JSON with this exact shape: {"days":[{"dayNumber":1,"activities":[{"title":"...","timeBlock":"morning|noon|afternoon|evening","locationName":"...","notes":"...","estimatedCost":0}]}]}. Provide 2-4 realistic activities per day with practical Vietnamese notes.',
      input: {
        title: trip.title,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        travelers: trip.adultCount + trip.childCount,
        budgetAmount: trip.budgetAmount,
        travelStyles: trip.travelStyles,
        days: trip.itineraryDays.map((day) => ({ dayNumber: day.dayNumber, date: day.date })),
      },
    });

    const dayMap = new Map(trip.itineraryDays.map((day) => [day.dayNumber, day]));
    const existingTitlesByDay = new Map(
      trip.itineraryDays.map((day) => [
        day.dayNumber,
        new Set(day.activities.map((activity) => normalizeTitle(activity.title))),
      ]),
    );
    const activityInputs: Array<{ dayId: string; input: z.infer<typeof activityInputSchema> }> = [];
    const added: Array<{ dayNumber: number; title: string; timeBlock: string }> = [];

    for (const dayPlan of generated.days) {
      const day = dayMap.get(dayPlan.dayNumber);

      if (!day) {
        continue;
      }

      for (const activity of dayPlan.activities) {
        const normalizedTitle = normalizeTitle(activity.title);
        const existingTitles = existingTitlesByDay.get(dayPlan.dayNumber) ?? new Set<string>();

        if (existingTitles.has(normalizedTitle)) {
          continue;
        }

        existingTitles.add(normalizedTitle);
        existingTitlesByDay.set(dayPlan.dayNumber, existingTitles);
        activityInputs.push({
          dayId: day.id,
          input: {
            title: activity.title,
            timeBlock: activity.timeBlock,
            startTime: activity.startTime ?? "",
            endTime: activity.endTime ?? "",
            locationName: activity.locationName ?? "",
            estimatedCost: activity.estimatedCost ?? 0,
            notes: activity.notes ?? "",
          },
        });

        added.push({
          dayNumber: dayPlan.dayNumber,
          title: activity.title,
          timeBlock: activity.timeBlock,
        });
      }
    }

    const created = await addActivitiesToDays(
      activityInputs.map((item) => ({
        dayId: item.dayId,
        input: { ...item.input, address: "" },
      })),
    );

    if (!created) {
      return fail("NOT_FOUND", "Itinerary day not found.", 404);
    }

    return ok({ added });
  } catch (error) {
    const response = toAiErrorResponse(error);
    return fail(response.code, response.message, response.status);
  }
}

function normalizeTitle(title: string) {
  return title.trim().toLocaleLowerCase("vi");
}
