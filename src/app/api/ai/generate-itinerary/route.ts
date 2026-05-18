import { fail, ok, readJson } from "@/server/api-response";
import { ValidationError } from "@/server/errors";
import { getTrip, addActivity } from "@/server/travel-store";
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

const dayActivitiesSchema = z.object({
  dayNumber: z.number().int().min(1),
  activities: z.array(activityInputSchema).min(1),
});

const generateResponseSchema = z.object({
  days: z.array(dayActivitiesSchema),
});

type GeneratedItinerary = z.infer<typeof generateResponseSchema>;

export async function POST(request: Request) {
  const body = (await readJson<GenerateRequest>(request)) ?? {};

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
        "AI itinerary generation is not configured. Set ANTHROPIC_API_KEY.",
        503,
      );
    }

    const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
    const baseUrl = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1";

    const dayList = trip.itineraryDays.map((day) => ({
      dayNumber: day.dayNumber,
      date: day.date,
    }));

    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 3000,
        system:
          'You are a practical travel planner for Vietnamese travelers. Given a trip with dates and travel style, generate a realistic day-by-day itinerary. Return ONLY valid JSON with this exact shape: {"days":[{"dayNumber":1,"activities":[{"title":"...","timeBlock":"morning|noon|afternoon|evening","locationName":"...","notes":"...","estimatedCost":0}]}]}. Provide 2-4 activities per day spread across different time blocks. Include realistic locations and practical notes in Vietnamese. Do not include any other text.',
        messages: [
          {
            role: "user",
            content: `Generate a full itinerary for this trip:\n${JSON.stringify({
              title: trip.title,
              destination: trip.destination,
              startDate: trip.startDate,
              endDate: trip.endDate,
              travelers: trip.adultCount + trip.childCount,
              budgetAmount: trip.budgetAmount,
              travelStyles: trip.travelStyles,
              days: dayList,
            })}`,
          },
        ],
      }),
    });

    const payload = await readAnthropicResponse(response);

    if (!response.ok) {
      console.error("Generate itinerary request failed", {
        status: response.status,
        errorType: payload.error?.type,
        message: payload.error?.message,
      });

      return fail(
        response.status === 401 ? "FORBIDDEN" : "BAD_REQUEST",
        `AI itinerary generation failed with status ${response.status}.`,
        response.status === 401 || response.status === 429 ? response.status : 400,
      );
    }

    const text = getOutputText(payload);

    if (!text) {
      console.error("Generate itinerary response did not include output text");
      return fail("BAD_REQUEST", "AI returned an empty itinerary response.", 400);
    }

    const parsed = parseGeneratedItinerary(text);

    const dayMap = new Map(trip.itineraryDays.map((day) => [day.dayNumber, day]));
    const added: Array<{ dayNumber: number; title: string; timeBlock: string }> = [];

    for (const dayPlan of parsed.days) {
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
    console.error("Generate itinerary route failed", {
      message: error instanceof Error ? error.message : String(error),
    });

    return fail("BAD_REQUEST", getAiClientErrorMessage(error));
  }
}

function parseGeneratedItinerary(text: string): GeneratedItinerary {
  const parsed = JSON.parse(stripJsonCodeFence(text)) as unknown;
  const result = generateResponseSchema.safeParse(parsed);

  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? "AI itinerary response did not match the expected format.");
  }

  return result.data;
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

function getOutputText(payload: AnthropicResponse) {
  const blocks = payload.content ?? [];

  const textBlock = blocks
    .filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text)
    .find((t) => t.trim().length > 0);

  if (textBlock) return textBlock;

  const thinkingBlock = blocks
    .filter((block): block is { type: "thinking"; thinking: string } => block.type === "thinking")
    .map((block) => (block as { thinking: string }).thinking)
    .find((t) => t?.trim().length > 0);

  if (!thinkingBlock) return undefined;

  const lastBrace = thinkingBlock.lastIndexOf('{');
  if (lastBrace === -1) return undefined;

  let braceCount = 0;
  let bracketCount = 0;
  let inStr = false;
  let esc = false;
  for (let i = lastBrace; i < thinkingBlock.length; i++) {
    const ch = thinkingBlock[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') braceCount++;
    if (ch === '}') braceCount--;
    if (ch === '[') bracketCount++;
    if (ch === ']') bracketCount--;
    if (braceCount === 0 && bracketCount === 0) {
      return thinkingBlock.substring(lastBrace, i + 1);
    }
  }
  let fixed = thinkingBlock.substring(lastBrace);
  let bCount = 0;
  let brCount = 0;
  let inS = false;
  let es2 = false;
  for (const ch of fixed) {
    if (es2) { es2 = false; continue; }
    if (ch === '\\') { es2 = true; continue; }
    if (ch === '"') { inS = !inS; continue; }
    if (inS) continue;
    if (ch === '{') bCount++;
    if (ch === '}') bCount--;
    if (ch === '[') brCount++;
    if (ch === ']') brCount--;
  }
  if (inS) fixed += '"';
  while (brCount > 0) { fixed += ']'; brCount--; }
  while (bCount > 0) { fixed += '}'; bCount--; }
  return fixed;
}

function getAiClientErrorMessage(error: unknown) {
  if (error instanceof SyntaxError) {
    return "AI returned a response that was not valid JSON.";
  }

  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof Error) {
    return `AI itinerary generation failed: ${truncateMessage(error.message)}`;
  }

  return `AI itinerary generation failed: ${truncateMessage(String(error))}`;
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
