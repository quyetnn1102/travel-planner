import { fail, ok, readJson } from "@/server/api-response";
import { ValidationError } from "@/server/errors";
import { z } from "zod";

type PreviewRequest = {
  draft?: Record<string, unknown>;
};

const previewActivitySchema = z.object({
  title: z.string().min(1),
  timeBlock: z.enum(["morning", "noon", "afternoon", "evening"]),
  locationName: z.string().optional(),
  notes: z.string().optional(),
});

const previewDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  date: z.string(),
  summary: z.string().min(1),
  activities: z.array(previewActivitySchema).min(1),
});

const tripPreviewResponseSchema = z.object({
  preview: z.object({
    suggestedTitle: z.string().min(1),
    destinationDescription: z.string().min(1),
    itineraryPreview: z.array(previewDaySchema),
  }),
});

type GeneratedPreview = z.infer<typeof tripPreviewResponseSchema>;

export async function POST(request: Request) {
  const body = (await readJson<PreviewRequest>(request)) ?? {};

  try {
    const draft = body.draft;

    if (!draft || typeof draft !== "object") {
      throw new ValidationError("Trip draft is required.");
    }

    if (
      !(draft as Record<string, unknown>).destination ||
      String((draft as Record<string, unknown>).destination).trim().length === 0
    ) {
      throw new ValidationError("Destination is required.");
    }

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim().replace(/^["']|["']$/g, "");

    if (!apiKey) {
      return fail("SERVICE_UNAVAILABLE", "AI preview is not configured. Set ANTHROPIC_API_KEY.", 503);
    }

    const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
    const baseUrl = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1";

    const destination = String(draft.destination).trim();
    const startDate = String(draft.startDate ?? "");
    const endDate = String(draft.endDate ?? "");
    const travelers = Number(draft.adultCount ?? 1) + Number(draft.childCount ?? 0);
    const budgetAmount = Number(draft.budgetAmount ?? 0);
    const travelStyles = Array.isArray(draft.travelStyles) ? draft.travelStyles : [];
    const notes = String(draft.notes ?? "");

    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system:
          'You are a Vietnamese travel planner. Generate a trip preview JSON. Return ONLY: {"preview":{"suggestedTitle":"short catchy title","destinationDescription":"1 sentence about the destination","itineraryPreview":[{"dayNumber":1,"date":"YYYY-MM-DD","summary":"1-line day summary","activities":[{"title":"short activity name","timeBlock":"morning|noon|afternoon|evening","locationName":"place name","notes":"brief tip"}]}]}}. Keep all fields concise. 1-2 activities per day. No other text.',
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              destination,
              startDate,
              endDate,
              travelers,
              budgetAmount,
              travelStyles,
              notes,
            }),
          },
        ],
      }),
    });

    const payload = await readAnthropicResponse(response);

    if (!response.ok) {
      console.error("Preview trip request failed", {
        status: response.status,
        errorType: payload.error?.type,
        message: payload.error?.message,
      });

      return fail(
        response.status === 401 ? "FORBIDDEN" : "BAD_REQUEST",
        `AI preview failed with status ${response.status}.`,
        response.status === 401 || response.status === 429 ? response.status : 400,
      );
    }

    const text = getOutputText(payload);

    if (!text) {
      console.error("Preview trip response did not include output text");
      return fail("BAD_REQUEST", "AI returned an empty preview response.", 400);
    }

    const parsed = parsePreview(text);

    return ok(parsed);
  } catch (error) {
    console.error("Preview trip route failed", {
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? (error.cause as unknown) : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return fail("BAD_REQUEST", getAiClientErrorMessage(error));
  }
}

function parsePreview(text: string): GeneratedPreview {
  const parsed = safeParseJson(stripJsonCodeFence(text)) as unknown;
  const result = tripPreviewResponseSchema.safeParse(parsed);

  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? "AI preview response did not match the expected format.");
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
    return `AI preview failed: ${truncateMessage(error.message)}`;
  }

  return `AI preview failed: ${truncateMessage(String(error))}`;
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
