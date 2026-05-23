"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function SignInPanel({
  hasGoogleProvider,
  hasAuthSecret,
  callbackUrl,
}: {
  hasGoogleProvider: boolean;
  hasAuthSecret: boolean;
  callbackUrl: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const canSignIn = hasGoogleProvider && hasAuthSecret;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f1e8] px-5 text-[#17211b]">
      <section className="w-full max-w-md rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-6 shadow-sm">
        <p className="text-xs font-extrabold uppercase text-[#756f65]">L&#7919; Tr&#236;nh</p>
        <h1 className="mt-2 text-3xl font-extrabold">&#272;&#259;ng nh&#7853;p</h1>
        <p className="mt-3 text-sm leading-6 text-[#6d675c]">
          D&#249;ng Google &#273;&#7875; l&#432;u chuy&#7871;n &#273;i, t&#7841;o m&#7851;u l&#7883;ch tr&#236;nh v&#224; chia s&#7867; k&#7871; ho&#7841;ch an to&#224;n.
        </p>

        {!canSignIn ? (
          <div className="mt-5 rounded-lg border border-[#f0c7b8] bg-[#fff4ef] p-4 text-sm font-semibold leading-6 text-[#9b3519]">
            {!hasAuthSecret ? <p>Thi&#7871;u bi&#7871;n m&#244;i tr&#432;&#7901;ng AUTH_SECRET ho&#7863;c NEXTAUTH_SECRET trong Vercel.</p> : null}
            {!hasGoogleProvider ? <p>Thi&#7871;u GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET ho&#7863;c AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET.</p> : null}
          </div>
        ) : null}

        <button
          type="button"
          disabled={!canSignIn || isLoading}
          onClick={() => {
            setIsLoading(true);
            void signIn("google", { callbackUrl });
          }}
          className="mt-5 flex w-full items-center justify-center rounded-lg bg-[#17211b] px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "\u0110ang chuy\u1ec3n t\u1edbi Google..." : "Ti\u1ebfp t\u1ee5c v\u1edbi Google"}
        </button>

        <Link href="/" className="mt-4 block text-center text-sm font-bold text-[#315f45]">
          Quay l&#7841;i trang ch&#237;nh
        </Link>
      </section>
    </main>
  );
}
