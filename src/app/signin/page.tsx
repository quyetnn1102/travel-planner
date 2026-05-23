import { SignInPanel } from "@/components/sign-in-panel";

type SignInPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { callbackUrl } = await searchParams;
  const hasGoogleProvider = Boolean(
    (process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID) &&
      (process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET),
  );
  const hasAuthSecret = Boolean(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET);

  return (
    <SignInPanel
      hasGoogleProvider={hasGoogleProvider}
      hasAuthSecret={hasAuthSecret}
      callbackUrl={isSafeCallbackUrl(callbackUrl) ? callbackUrl : "/"}
    />
  );
}

function isSafeCallbackUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}
