import { SignInPanel } from "@/components/sign-in-panel";

export default function SignInPage() {
  const hasGoogleProvider = Boolean(
    (process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID) &&
      (process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET),
  );
  const hasAuthSecret = Boolean(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET);

  return <SignInPanel hasGoogleProvider={hasGoogleProvider} hasAuthSecret={hasAuthSecret} />;
}
