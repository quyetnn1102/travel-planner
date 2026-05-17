import { fail, ok, readJson } from "@/server/api-response";
import { ValidationError } from "@/server/errors";
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
    if (!body.tripId) {
      throw new ValidationError("Trip id is required.");
    }

    const trip = await getTrip(body.tripId);

    if (!trip) {
      return fail("NOT_FOUND", "Trip not found.", 404);
    }

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim().replace(/^["']|["']$/g, "");

    if (!apiKey) {
      return fail(
        "SERVICE_UNAVAILABLE",
        "AI recommendations are not configured. Set ANTHROPIC_API_KEY in the server environment.",
        503,
      );
    }

    const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

    const baseUrl = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1";
    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        system:
          'You are a practical travel planner for Vietnamese travelers. Return only valid JSON with this exact shape: {"recommendations":[{"title":"...","rationale":"...","priority":"high|medium|low"}]}. Provide 1 to 3 concise, actionable recommendations. Do not include any other text.',
        messages: [
          {
            role: "user",
            content: `Generate JSON recommendations for this trip:\n${JSON.stringify({
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
            })}`,
          },
        ],
      }),
    });

    const payload = await readAnthropicResponse(response);

    if (!response.ok) {
      console.error("Anthropic recommendations request failed", {
        status: response.status,
        errorType: payload.error?.type,
        message: payload.error?.message,
      });

      return fail(
        response.status === 401 ? "FORBIDDEN" : "BAD_REQUEST",
        getAnthropicClientMessage(response.status, payload.error?.message),
        response.status === 401 || response.status === 429 ? response.status : 400,
      );
    }

    const text = getOutputText(payload);

    if (!text) {
      console.error("Anthropic recommendations response did not include output text");
      return fail("BAD_REQUEST", "Anthropic returned an empty recommendation response.", 400);
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

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: string; [key: string]: unknown };

type AnthropicResponse = {
  content?: AnthropicContentBlock[];
  error?: {
    type?: string;
    message?: string;
  };
};

function parseRecommendations(text: string) {
  const parsed = JSON.parse(stripJsonCodeFence(text)) as unknown;
  const result = recommendationsSchema.safeParse(parsed);

  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? "AI response did not match the expected format.");
  }

  return result.data;
}

function getOutputText(payload: AnthropicResponse) {
  return payload.content
    ?.filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text)
    .find((text) => text.trim().length > 0);
}

function getAnthropicClientMessage(status: number, upstreamMessage?: string) {
  if (status === 401) {
    return "Anthropic rejected the API key. Check ANTHROPIC_API_KEY in Vercel.";
  }

  if (status === 429) {
    return "Anthropic rate limit was reached. Check your Anthropic billing and usage limits.";
  }

  if (status === 400 && upstreamMessage) {
    return `Anthropic rejected the request: ${upstreamMessage}`;
  }

  return `Anthropic request failed with status ${status}${upstreamMessage ? `: ${upstreamMessage}` : "."}`;
}

function getAiClientErrorMessage(error: unknown) {
  if (error instanceof SyntaxError) {
    return "Anthropic returned a response that was not valid JSON.";
  }

  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof Error) {
    return `AI recommendation failed: ${truncateMessage(error.message)}`;
  }

  return `AI recommendation failed with an unknown server error: ${truncateMessage(String(error))}`;
}

function stripJsonCodeFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
}

async function readAnthropicResponse(response: Response): Promise<AnthropicResponse> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as AnthropicResponse;
  } catch {
    return {
      error: {
        message: truncateMessage(text),
      },
    };
  }
}

function truncateMessage(message: string) {
  return message.length > 240 ? `${message.slice(0, 240)}...` : message;
}
