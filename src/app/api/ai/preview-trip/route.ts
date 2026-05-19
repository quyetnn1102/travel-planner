import { fail, ok, readJson } from "@/server/api-response";
import { generateOpenAIJson, toAiErrorResponse } from "@/server/ai/openai";
import { ValidationError } from "@/server/errors";
import { assertRateLimit } from "@/server/rate-limit";
import { requireCurrentUser } from "@/server/auth";
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

export async function POST(request: Request) {
  const body = (await readJson<PreviewRequest>(request)) ?? {};

  try {
    await requireCurrentUser();
    assertRateLimit(request, "ai:preview", 10);

    const draft = body.draft;

    if (!draft || typeof draft !== "object") {
      throw new ValidationError("Trip draft is required.");
    }

    if (!String(draft.destination ?? "").trim()) {
      throw new ValidationError("Destination is required.");
    }

    const result = await generateOpenAIJson({
      schema: tripPreviewResponseSchema,
      maxOutputTokens: 2200,
      instructions:
        'You are a Vietnamese travel planner. Return only JSON with this exact shape: {"preview":{"suggestedTitle":"short catchy title","destinationDescription":"1 sentence","itineraryPreview":[{"dayNumber":1,"date":"YYYY-MM-DD","summary":"1-line day summary","activities":[{"title":"short activity name","timeBlock":"morning|noon|afternoon|evening","locationName":"place name","notes":"brief tip"}]}]}}. Keep fields concise. Include 1-2 activities per day.',
      input: draft,
    });

    return ok(result);
  } catch (error) {
    const response = toAiErrorResponse(error);
    return fail(response.code, response.message, response.status);
  }
}
