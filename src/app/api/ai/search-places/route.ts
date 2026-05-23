import { fail, ok, readJson } from "@/server/api-response";
import { generateOpenAIJson, toAiErrorResponse } from "@/server/ai/openai";
import { requireCurrentUser } from "@/server/auth";
import { ValidationError } from "@/server/errors";
import { assertRateLimit } from "@/server/rate-limit";
import { getTrip } from "@/server/travel-store";
import { z } from "zod";

type SearchRequest = {
  tripId?: string;
  query?: string;
};

const searchPlacesSchema = z.object({
  places: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        locationName: z.string().min(1),
        suggestedTimeBlock: z.enum(["morning", "noon", "afternoon", "evening"]),
        estimatedCost: z.number().min(0),
      }),
    )
    .min(1)
    .max(5),
});

export async function POST(request: Request) {
  const body = (await readJson<SearchRequest>(request)) ?? {};

  try {
    const user = await requireCurrentUser();
    await assertRateLimit(request, "ai:search-places", 15, 60_000, user.id);

    if (!body.tripId) {
      throw new ValidationError("Trip id is required.");
    }

    if (!body.query?.trim()) {
      throw new ValidationError("Search query is required.");
    }

    const trip = await getTrip(body.tripId);

    if (!trip) {
      return fail("NOT_FOUND", "Trip not found.", 404);
    }

    const result = await generateOpenAIJson({
      schema: searchPlacesSchema,
      schemaName: "place_search_results",
      maxOutputTokens: 1800,
      instructions:
        'Return only JSON: {"places":[{"name":"short name","description":"1-line description in Vietnamese","locationName":"area","suggestedTimeBlock":"morning|noon|afternoon|evening","estimatedCost":0}]}. Suggest 3-4 real places. Be concise.',
      input: {
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        travelStyles: trip.travelStyles,
        budgetAmount: trip.budgetAmount,
        query: body.query.trim(),
        existingActivities: trip.itineraryDays.flatMap((day) => day.activities.map((activity) => activity.title)),
      },
    });

    return ok(result);
  } catch (error) {
    const response = toAiErrorResponse(error);
    return fail(response.code, response.message, response.status);
  }
}
