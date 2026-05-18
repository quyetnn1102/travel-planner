import { fail, ok, readJson } from "@/server/api-response";
import { generateOpenAIJson, toAiErrorResponse } from "@/server/ai/openai";
import { ValidationError } from "@/server/errors";
import { assertRateLimit } from "@/server/rate-limit";
import { addActivity, getTrip } from "@/server/travel-store";
import { z } from "zod";

type GenerateRequest = {
  tripId?: string;
};

const activityInputSchema = z.object({
  title: z.string().min(1),
  timeBlock: z.enum(["morning", "noon", "afternoon", "evening"]),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
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
    const added: Array<{ dayNumber: number; title: string; timeBlock: string }> = [];

    for (const dayPlan of generated.days) {
      const day = dayMap.get(dayPlan.dayNumber);

      if (!day) {
        continue;
      }

      for (const activity of dayPlan.activities) {
        await addActivity(day.id, {
          title: activity.title,
          timeBlock: activity.timeBlock,
          startTime: activity.startTime ?? "",
          endTime: activity.endTime ?? "",
          locationName: activity.locationName ?? "",
          address: "",
          estimatedCost: activity.estimatedCost ?? 0,
          notes: activity.notes ?? "",
        });

        added.push({
          dayNumber: dayPlan.dayNumber,
          title: activity.title,
          timeBlock: activity.timeBlock,
        });
      }
    }

    return ok({ added });
  } catch (error) {
    const response = toAiErrorResponse(error);
    return fail(response.code, response.message, response.status);
  }
}
