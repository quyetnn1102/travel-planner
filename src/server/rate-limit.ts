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

export async function assertRateLimit(
  request: Request,
  scope: string,
  limit = 20,
  windowMs = 60_000,
  subject?: string,
) {
  const key = `${scope}:${subject ?? getClientKey(request)}`;

  if (hasRuntimeDatabaseUrl()) {
    await assertDatabaseRateLimit(key, limit, windowMs);
    return;
  }

  assertMemoryRateLimit(key, limit, windowMs);
}

function assertMemoryRateLimit(key: string, limit: number, windowMs: number) {
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

async function assertDatabaseRateLimit(key: string, limit: number, windowMs: number) {
  const { prisma } = await import("@/server/db");
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  void prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: now } } }).catch(() => undefined);

  const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });

  if (!bucket || bucket.resetAt <= now) {
    await prisma.rateLimitBucket.upsert({
      where: { key },
      create: { key, count: 1, resetAt },
      update: { count: 1, resetAt },
    });
    return;
  }

  if (bucket.count >= limit) {
    throw new ValidationError("Too many requests. Please wait a moment and try again.");
  }

  await prisma.rateLimitBucket.update({
    where: { key },
    data: { count: { increment: 1 } },
  });
}

function getClientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local"
  );
}

function hasRuntimeDatabaseUrl() {
  return Boolean(
    process.env.DATABASE_URL ??
      process.env.POSTGRE_SQL_POSTGRES_PRISMA_URL ??
      process.env.POSTGRES_PRISMA_URL ??
      process.env.POSTGRES_URL ??
      process.env.POSTGRE_SQL_POSTGRES_URL_NON_POOLING ??
      process.env.POSTGRES_URL_NON_POOLING,
  );
}
