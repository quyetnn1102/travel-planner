import { z } from "zod";
import { timeBlocks } from "@/lib/travel";
import { ValidationError } from "@/server/errors";

const timeBlockValues = timeBlocks.map((block) => block.value) as [
  (typeof timeBlocks)[number]["value"],
  ...(typeof timeBlocks)[number]["value"][],
];

const optionalTimeSchema = z
  .string()
  .regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm.")
  .optional();

export const activityInputSchema = z.object({
  timeBlock: z.enum(timeBlockValues).optional(),
  title: z.string().trim().min(1, "Activity title is required.").max(120, "Activity title is too long."),
  startTime: optionalTimeSchema.default(""),
  endTime: optionalTimeSchema.default(""),
  locationName: z.string().trim().max(160, "Location is too long.").default(""),
  address: z.string().trim().max(240, "Address is too long.").default(""),
  estimatedCost: z.coerce.number().min(0, "Estimated cost cannot be negative.").default(0),
  notes: z.string().trim().max(1000, "Notes must be 1000 characters or less.").default(""),
});

export function parseActivityInput(input: unknown) {
  const parsed = activityInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid activity payload.");
  }

  return parsed.data;
}
