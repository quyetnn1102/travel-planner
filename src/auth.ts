import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = getDatabaseUrl();

const authPrisma = databaseUrl
  ? new PrismaClient({
      adapter: new PrismaPg({
        connectionString: toNoVerifySslUrl(databaseUrl),
        ssl: { rejectUnauthorized: false },
      }),
    })
  : null;

const googleClientId = process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET;
const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: authPrisma ? PrismaAdapter(authPrisma) : undefined,
  providers: googleClientId && googleClientSecret ? [Google({ clientId: googleClientId, clientSecret: googleClientSecret })] : [],
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  secret: authSecret,
  session: {
    strategy: authPrisma ? "database" : "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      return token;
    },
    session({ session, token, user }) {
      const userId = user?.id ?? (typeof token?.id === "string" ? token.id : undefined);

      if (userId) {
        session.user.id = userId;
      }

      return session;
    },
  },
  trustHost: true,
});

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRE_SQL_POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRE_SQL_POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_URL_NON_POOLING ??
    ""
  );
}

function toNoVerifySslUrl(connectionString: string) {
  const url = new URL(connectionString);
  url.searchParams.set("sslmode", "no-verify");
  return url.toString();
}
