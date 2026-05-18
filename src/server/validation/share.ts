import { z } from "zod";
import { ValidationError } from "@/server/errors";

export const shareUpdateSchema = z.object({
  isEnabled: z.boolean(),
});

export function parseShareUpdateInput(input: unknown) {
  const parsed = shareUpdateSchema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid share payload.");
  }

  return parsed.data;
}
