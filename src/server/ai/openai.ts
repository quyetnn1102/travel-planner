import { z } from "zod";

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      output_text?: string;
    }>;
  }>;
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
};

export class AiConfigurationError extends Error {
  constructor(message = "AI is not configured. Set OPENAI_API_KEY in the server environment.") {
    super(message);
    this.name = "AiConfigurationError";
  }
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

export async function generateOpenAIJson<T>({
  schema,
  instructions,
  input,
  maxOutputTokens = 1600,
}: {
  schema: z.ZodType<T>;
  instructions: string;
  input: unknown;
  maxOutputTokens?: number;
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim().replace(/^["']|["']$/g, "");

  if (!apiKey) {
    throw new AiConfigurationError();
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      max_output_tokens: maxOutputTokens,
      instructions,
      text: {
        format: { type: "json_object" },
      },
      input: `Return JSON for this request:\n${JSON.stringify(input)}`,
    }),
  });

  const payload = await readOpenAIResponse(response);

  if (!response.ok) {
    throw new AiProviderError(getOpenAIClientMessage(response.status, payload.error?.message), response.status);
  }

  const outputText = getOutputText(payload);

  if (!outputText) {
    throw new AiProviderError("OpenAI returned an empty response.");
  }

  const parsed = safeParseJson(stripJsonCodeFence(outputText));
  const result = schema.safeParse(parsed);

  if (!result.success) {
    throw new AiProviderError(result.error.issues[0]?.message ?? "AI response did not match the expected format.");
  }

  return result.data;
}

export function toAiErrorResponse(error: unknown) {
  if (error instanceof AiConfigurationError) {
    return { code: "SERVICE_UNAVAILABLE" as const, message: error.message, status: 503 };
  }

  if (error instanceof AiProviderError) {
    return {
      code: error.status === 401 ? ("FORBIDDEN" as const) : ("BAD_REQUEST" as const),
      message: error.message,
      status: error.status === 401 || error.status === 429 ? error.status : 400,
    };
  }

  if (error instanceof SyntaxError) {
    return { code: "BAD_REQUEST" as const, message: "OpenAI returned a response that was not valid JSON.", status: 400 };
  }

  return {
    code: "BAD_REQUEST" as const,
    message: error instanceof Error ? `AI request failed: ${truncateMessage(error.message)}` : "AI request failed.",
    status: 400,
  };
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

async function readOpenAIResponse(response: Response): Promise<OpenAIResponse> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as OpenAIResponse;
  } catch {
    return {
      error: {
        message: truncateMessage(text),
      },
    };
  }
}

function safeParseJson(text: string) {
  return JSON.parse(text) as unknown;
}

function stripJsonCodeFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
}

function getOpenAIClientMessage(status: number, upstreamMessage?: string) {
  if (status === 401) {
    return "OpenAI rejected the API key. Check OPENAI_API_KEY in Vercel.";
  }

  if (status === 429) {
    return "OpenAI rate limit or quota was reached. Check your OpenAI billing and usage limits.";
  }

  return `OpenAI request failed with status ${status}${upstreamMessage ? `: ${upstreamMessage}` : "."}`;
}

function truncateMessage(message: string) {
  return message.length > 240 ? `${message.slice(0, 240)}...` : message;
}
