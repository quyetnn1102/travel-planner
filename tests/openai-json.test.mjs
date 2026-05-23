import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { z } from "zod";

import { AiProviderError, generateOpenAIJson } from "../src/server/ai/openai.ts";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.OPENAI_API_KEY;
const originalModel = process.env.OPENAI_MODEL;

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.OPENAI_API_KEY = originalApiKey;
  process.env.OPENAI_MODEL = originalModel;
});

test("OpenAI JSON helper sends Responses API structured-output schema", async () => {
  let requestBody;
  process.env.OPENAI_API_KEY = "sk-test";
  delete process.env.OPENAI_MODEL;

  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(String(init.body));

    return new Response(JSON.stringify({ output_text: '{"ok":"yes"}' }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const result = await generateOpenAIJson({
    schemaName: "test_schema",
    schema: z.object({ ok: z.string() }),
    instructions: "Return JSON.",
    input: { prompt: "hello" },
  });

  assert.deepEqual(result, { ok: "yes" });
  assert.equal(requestBody.model, "gpt-4o-mini");
  assert.equal(requestBody.text.format.type, "json_schema");
  assert.equal(requestBody.text.format.name, "test_schema");
  assert.equal(requestBody.text.format.strict, true);
  assert.equal(requestBody.text.format.schema.additionalProperties, false);
  assert.deepEqual(requestBody.text.format.schema.required, ["ok"]);
});

test("OpenAI JSON helper rejects output that fails the local Zod schema", async () => {
  process.env.OPENAI_API_KEY = "sk-test";

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ output_text: '{"ok":123}' }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  await assert.rejects(
    generateOpenAIJson({
      schemaName: "test_schema",
      schema: z.object({ ok: z.string() }),
      instructions: "Return JSON.",
      input: { prompt: "hello" },
    }),
    AiProviderError,
  );
});
