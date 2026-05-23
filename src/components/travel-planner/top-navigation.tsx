import Link from "next/link";
import { signOut } from "next-auth/react";
import type { CurrentUser } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { localeOptions, uiText } from "@/lib/i18n";

export function TopNavigation({
  locale,
  currentUser,
  onLocaleChange,
}: {
  locale: Locale;
  currentUser: CurrentUser | null;
  onLocaleChange: (locale: Locale) => void;
}) {
  const text = uiText[locale];
  const userLabel = currentUser?.name ?? currentUser?.email ?? "";

  return (
    <header className="mx-auto flex max-w-[1480px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#17211b] text-sm font-bold text-white">
          TP
        </div>
        <div>
          <p className="text-base font-extrabold leading-5">Lữ Trình</p>
          <p className="text-xs font-semibold text-[#6d6a60]">{text.navTagline}</p>
        </div>
      </div>
      <nav className="flex items-center gap-3 text-sm font-semibold text-[#615f57]">
        <div className="hidden items-center gap-5 md:flex">
          <a href="#planner">{text.navItinerary}</a>
          <a href="#budget">{text.navBudget}</a>
          <a href="#booking">{text.tabs.booking}</a>
          <a href="#share">{text.navShare}</a>
        </div>
        <div className="flex rounded-full border border-[#d8cfbd] bg-[#fffdf8] p-1">
          {localeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onLocaleChange(option.value)}
              className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                locale === option.value ? "bg-[#17211b] text-white" : "text-[#6d675c]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {currentUser ? (
          <div className="flex items-center gap-2 rounded-full border border-[#d8cfbd] bg-[#fffdf8] py-1 pl-3 pr-1">
            <div className="hidden max-w-44 truncate text-xs font-extrabold text-[#17211b] sm:block">
              {userLabel}
            </div>
            <button
              type="button"
              onClick={() => {
                void signOut({ callbackUrl: "/" });
              }}
              className="rounded-full bg-[#17211b] px-3 py-1.5 text-xs font-extrabold text-white"
            >
              {locale === "vi" ? "\u0110\u0103ng xu\u1ea5t" : "Sign out"}
            </button>
          </div>
        ) : (
          <Link
            href="/signin"
            className="rounded-full border border-[#17211b] bg-[#17211b] px-4 py-2 text-xs font-extrabold text-white"
          >
            {locale === "vi" ? "\u0110\u0103ng nh\u1eadp" : "Sign in"}
          </Link>
        )}
      </nav>
    </header>
  );
}


