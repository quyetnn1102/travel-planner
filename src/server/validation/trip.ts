import { z } from "zod";
import { travelStyles } from "@/lib/travel";
import { ValidationError } from "@/server/errors";

const travelStyleValues = travelStyles.map((style) => style.value) as [
  (typeof travelStyles)[number]["value"],
  ...(typeof travelStyles)[number]["value"][],
];

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD.");

export const tripDraftSchema = z
  .object({
    title: z.string().trim().min(1, "Trip title is required.").max(100, "Trip title must be 100 characters or less."),
    destination: z
      .string()
      .trim()
      .min(1, "Destination is required.")
      .max(100, "Destination must be 100 characters or less."),
    startDate: dateSchema,
    endDate: dateSchema,
    adultCount: z.coerce.number().int().min(1, "Adult count must be at least 1."),
    childCount: z.coerce.number().int().min(0, "Child count cannot be negative."),
    budgetAmount: z.coerce.number().min(0, "Budget cannot be negative."),
    travelStyles: z.array(z.enum(travelStyleValues)).default([]),
    notes: z.string().max(2000, "Notes must be 2000 characters or less.").default(""),
  })
  .refine((value) => value.endDate >= value.startDate, {
    path: ["endDate"],
    message: "End date must be on or after start date.",
  });

export function parseTripDraftInput(input: unknown) {
  const parsed = tripDraftSchema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid trip payload.");
  }

  return parsed.data;
}
