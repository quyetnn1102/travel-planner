import { z } from "zod";
import { costCategories } from "@/lib/travel";
import { ValidationError } from "@/server/errors";

const costCategoryValues = costCategories.map((category) => category.value) as [
  (typeof costCategories)[number]["value"],
  ...(typeof costCategories)[number]["value"][],
];

export const costInputSchema = z.object({
  category: z.enum(costCategoryValues).optional(),
  name: z.string().trim().min(1, "Cost name is required.").max(120, "Cost name is too long."),
  amount: z.coerce.number().min(0, "Cost amount cannot be negative."),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").default(1),
  notes: z.string().trim().max(1000, "Notes must be 1000 characters or less.").default(""),
});

export function parseCostInput(input: unknown) {
  const parsed = costInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid cost payload.");
  }

  return parsed.data;
}
