import { fail, ok, readJson } from "@/server/api-response";
import { generateOpenAIJson, toAiErrorResponse } from "@/server/ai/openai";
import { ValidationError } from "@/server/errors";
import { assertRateLimit } from "@/server/rate-limit";
import { getTrip } from "@/server/travel-store";
import { z } from "zod";

type RecommendationRequest = {
  tripId?: string;
};

const recommendationsSchema = z.object({
  recommendations: z
    .array(
      z.object({
        title: z.string().min(1),
        rationale: z.string().min(1),
        priority: z.enum(["high", "medium", "low"]),
      }),
    )
    .min(1)
    .max(3),
});

export async function POST(request: Request) {
  const body = (await readJson<RecommendationRequest>(request)) ?? {};

  try {
    assertRateLimit(request, "ai:recommendations", 10);

    if (!body.tripId) {
      throw new ValidationError("Trip id is required.");
    }

    const trip = await getTrip(body.tripId);

    if (!trip) {
      return fail("NOT_FOUND", "Trip not found.", 404);
    }

    const result = await generateOpenAIJson({
      schema: recommendationsSchema,
      maxOutputTokens: 900,
      instructions:
        'You are a practical travel planner for Vietnamese travelers. Return only JSON with this exact shape: {"recommendations":[{"title":"...","rationale":"...","priority":"high|medium|low"}]}. Provide 1 to 3 concise, actionable recommendations.',
      input: {
        title: trip.title,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        travelers: trip.adultCount + trip.childCount,
        budgetAmount: trip.budgetAmount,
        travelStyles: trip.travelStyles,
        days: trip.itineraryDays.map((day) => ({
          date: day.date,
          activityCount: day.activities.length,
          activities: day.activities.map((activity) => ({
            timeBlock: activity.timeBlock,
            title: activity.title,
            locationName: activity.locationName,
          })),
        })),
        costs: trip.costItems.map((item) => ({
          category: item.category,
          name: item.name,
          amount: item.amount,
          quantity: item.quantity,
        })),
      },
    });

    return ok(result);
  } catch (error) {
    const response = toAiErrorResponse(error);
    return fail(response.code, response.message, response.status);
  }
}
