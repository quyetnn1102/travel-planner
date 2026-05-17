import { fail, ok, readJson } from "@/server/api-response";
import { toClientErrorMessage, ValidationError } from "@/server/errors";
import { getTrip } from "@/server/travel-store";
import { z } from "zod";

type RecommendationRequest = {
  tripId?: string;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
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
    if (!body.tripId) {
      throw new ValidationError("Trip id is required.");
    }

    const trip = await getTrip(body.tripId);

    if (!trip) {
      return fail("NOT_FOUND", "Trip not found.", 404);
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return fail(
        "SERVICE_UNAVAILABLE",
        "AI recommendations are not configured. Set OPENAI_API_KEY in the server environment.",
        503,
      );
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
        max_output_tokens: 800,
        instructions:
          "You are a practical travel planner for Vietnamese travelers. Give concise, actionable recommendations.",
        text: {
          format: {
            type: "json_schema",
            name: "trip_recommendations",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                recommendations: {
                  type: "array",
                  minItems: 1,
                  maxItems: 3,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      title: { type: "string" },
                      rationale: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] },
                    },
                    required: ["title", "rationale", "priority"],
                  },
                },
              },
              required: ["recommendations"],
            },
          },
        },
        input: JSON.stringify({
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
        }),
      }),
    });

    const payload = (await response.json()) as OpenAIResponse;

    if (!response.ok) {
      throw new Error("AI recommendation request failed.");
    }

    const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text;
    const parsed = parseRecommendations(text ?? "");

    return ok(parsed);
  } catch (error) {
    return fail("BAD_REQUEST", toClientErrorMessage(error, "Unable to generate AI recommendations."));
  }
}

function parseRecommendations(text: string) {
  const parsed = JSON.parse(text) as unknown;
  return recommendationsSchema.parse(parsed);
}
