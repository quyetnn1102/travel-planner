import { auth } from "@/auth";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  authMode: "authjs" | "development-stub";
};

export class AuthenticationError extends Error {
  constructor(message = "Authentication is required.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!hasRuntimeDatabaseUrl() && process.env.NODE_ENV !== "production") {
    return {
      id: process.env.TRAVEL_PLANNER_DEV_USER_ID ?? "dev-user",
      name: "Demo User",
      email: "demo@example.com",
      authMode: "development-stub",
    };
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const sessionUser = session.user;

  return {
    id: userId,
    name: sessionUser?.name ?? null,
    email: sessionUser?.email ?? null,
    authMode: "authjs",
  };
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthenticationError();
  }

  return user;
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
