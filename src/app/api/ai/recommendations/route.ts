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
      output_text?: string;
      text?: string;
    }>;
  }>;
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
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
    const normalizedApiKey = apiKey?.trim().replace(/^["']|["']$/g, "");

    if (!normalizedApiKey) {
      return fail(
        "SERVICE_UNAVAILABLE",
        "AI recommendations are not configured. Set OPENAI_API_KEY in the server environment.",
        503,
      );
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${normalizedApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
        max_output_tokens: 800,
        instructions:
          "You are a practical travel planner for Vietnamese travelers. Return only JSON with this exact shape: {\"recommendations\":[{\"title\":\"...\",\"rationale\":\"...\",\"priority\":\"high|medium|low\"}]}. Return 1 to 3 concise, actionable recommendations.",
        text: {
          format: {
            type: "json_object",
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
      console.error("OpenAI recommendations request failed", {
        status: response.status,
        code: payload.error?.code,
        type: payload.error?.type,
        message: payload.error?.message,
      });

      return fail(
        response.status === 401 ? "FORBIDDEN" : "BAD_REQUEST",
        getOpenAIClientMessage(response.status, payload.error?.message),
        response.status === 401 || response.status === 429 ? response.status : 400,
      );
    }

    const text = getOutputText(payload);

    if (!text) {
      console.error("OpenAI recommendations response did not include output text", {
        outputItems: payload.output?.length ?? 0,
      });

      return fail("BAD_REQUEST", "OpenAI returned an empty recommendation response.", 400);
    }

    const parsed = parseRecommendations(text);

    return ok(parsed);
  } catch (error) {
    console.error("AI recommendations route failed", {
      message: error instanceof Error ? error.message : String(error),
    });

    return fail("BAD_REQUEST", getAiClientErrorMessage(error));
  }
}

function parseRecommendations(text: string) {
  const parsed = JSON.parse(stripJsonCodeFence(text)) as unknown;
  const result = recommendationsSchema.safeParse(parsed);

  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? "AI response did not match the expected format.");
  }

  return result.data;
}

function getOutputText(payload: OpenAIResponse) {
  if (payload.output_text) {
    return payload.output_text;
  }

  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((item) => item.text ?? item.output_text)
    .find((text) => typeof text === "string" && text.trim().length > 0);
}

function getOpenAIClientMessage(status: number, upstreamMessage?: string) {
  if (status === 401) {
    return "OpenAI rejected the API key. Check OPENAI_API_KEY in Vercel.";
  }

  if (status === 429) {
    return "OpenAI rate limit or quota was reached. Check your OpenAI billing and usage limits.";
  }

  if (status === 400 && upstreamMessage) {
    return `OpenAI rejected the request: ${upstreamMessage}`;
  }

  return "Unable to generate AI recommendations.";
}

function getAiClientErrorMessage(error: unknown) {
  if (error instanceof SyntaxError) {
    return "OpenAI returned a response that was not valid JSON.";
  }

  return toClientErrorMessage(error, "Unable to generate AI recommendations.");
}

function stripJsonCodeFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
}
