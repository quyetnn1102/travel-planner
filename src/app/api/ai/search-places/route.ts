import { fail, ok, readJson } from "@/server/api-response";
import { ValidationError } from "@/server/errors";
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

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim().replace(/^["']|["']$/g, "");

    if (!apiKey) {
      return fail("SERVICE_UNAVAILABLE", "AI search is not configured. Set ANTHROPIC_API_KEY.", 503);
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
        max_tokens: 3000,
        system:
          'Return JSON: {"places":[{"name":"short name","description":"1-line description in Vietnamese","locationName":"area","suggestedTimeBlock":"morning|noon|afternoon|evening","estimatedCost":0}]}. Suggest 3-4 real places. Be concise. No other text.',
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              destination: trip.destination,
              startDate: trip.startDate,
              endDate: trip.endDate,
              travelStyles: trip.travelStyles,
              budgetAmount: trip.budgetAmount,
              query: body.query?.trim(),
              existingActivities: trip.itineraryDays.flatMap((day) =>
                day.activities.map((activity) => activity.title),
              ),
            }),
          },
        ],
      }),
    });

    const payload = await readAnthropicResponse(response);

    if (!response.ok) {
      console.error("Search places request failed", {
        status: response.status,
        errorType: payload.error?.type,
        message: payload.error?.message,
      });

      return fail(
        response.status === 401 ? "FORBIDDEN" : "BAD_REQUEST",
        `AI search failed with status ${response.status}.`,
        response.status === 401 || response.status === 429 ? response.status : 400,
      );
    }

    const text = getOutputText(payload);

    if (!text) {
      console.error("Search places response did not include output text", {
        contentCount: payload.content?.length ?? 0,
        contentTypes: payload.content?.map((block) => block.type) ?? [],
        sample: JSON.stringify(payload).substring(0, 500),
      });
      return fail("BAD_REQUEST", "AI returned an empty search response.", 400);
    }

    const parsed = parseSearchResults(text);

    return ok(parsed);
  } catch (error) {
    console.error("Search places route failed", {
      message: error instanceof Error ? error.message : String(error),
    });

    return fail("BAD_REQUEST", getAiClientErrorMessage(error));
  }
}

function parseSearchResults(text: string) {
  const parsed = safeParseJson(stripJsonCodeFence(text)) as unknown;
  const result = searchPlacesSchema.safeParse(parsed);

  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? "AI search response did not match the expected format.");
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

  // Prefer text blocks
  const textBlock = blocks
    .filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text)
    .find((t) => t.trim().length > 0);

  if (textBlock) return textBlock;

  // Fall back to thinking blocks (some models put output there)
  const thinkingBlock = blocks
    .filter((block): block is { type: "thinking"; thinking: string } => block.type === "thinking")
    .map((block) => (block as { thinking: string }).thinking)
    .find((t) => t?.trim().length > 0);

  if (!thinkingBlock) return undefined;

  // Find the LAST { that starts a JSON object — the actual response, not the template
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
  // If not balanced, apply safeParseJson recovery
  let fixed = thinkingBlock.substring(lastBrace);
  let bCount = 0;
  let brCount = 0;
  let inS = false;
  let es = false;
  for (const ch of fixed) {
    if (es) { es = false; continue; }
    if (ch === '\\') { es = true; continue; }
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
    return `AI search failed: ${truncateMessage(error.message)}`;
  }

  return `AI search failed: ${truncateMessage(String(error))}`;
}

function safeParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    // noop
  }

  let fixed = text.trimEnd();
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escaped = false;
  for (const ch of fixed) {
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") braceCount++;
    if (ch === "}") braceCount--;
    if (ch === "[") bracketCount++;
    if (ch === "]") bracketCount--;
  }
  if (inString) fixed += '"';
  while (bracketCount > 0) { fixed += "]"; bracketCount--; }
  while (braceCount > 0) { fixed += "}"; braceCount--; }

  return JSON.parse(fixed);
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
