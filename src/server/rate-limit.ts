import { ValidationError } from "@/server/errors";

type Bucket = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as typeof globalThis & {
  travelPlannerRateLimit?: Map<string, Bucket>;
};

const buckets = globalForRateLimit.travelPlannerRateLimit ?? new Map<string, Bucket>();
globalForRateLimit.travelPlannerRateLimit = buckets;

export function assertRateLimit(request: Request, scope: string, limit = 20, windowMs = 60_000) {
  const key = `${scope}:${getClientKey(request)}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (bucket.count >= limit) {
    throw new ValidationError("Too many requests. Please wait a moment and try again.");
  }

  bucket.count += 1;
}

function getClientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local"
  );
}
