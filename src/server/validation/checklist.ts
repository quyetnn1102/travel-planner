import { z } from "zod";
import { ValidationError } from "@/server/errors";

export const checklistInputSchema = z.object({
  title: z.string().trim().min(1, "Checklist title is required.").max(160, "Checklist title is too long.").optional(),
  isDone: z.boolean().optional(),
  category: z.string().trim().max(80, "Checklist category is too long.").optional(),
});

export function parseChecklistInput(input: unknown) {
  const parsed = checklistInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid checklist payload.");
  }

  return parsed.data;
}
