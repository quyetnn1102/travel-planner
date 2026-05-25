import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { uiText } from "@/lib/i18n";

export function EmptyState({ locale }: { locale: Locale }) {
  const text = uiText[locale];

  return (
    <section className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-10 text-center shadow-sm">
      <h2 className="text-2xl font-bold">{text.emptyTitle}</h2>
      <p className="mt-2 text-sm font-medium text-[#6d675c]">{text.emptyBody}</p>
    </section>
  );
}

export function GuestDashboardState({ locale }: { locale: Locale }) {
  const isVietnamese = locale === "vi";

  return (
    <section className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-10 text-center shadow-sm">
      <p className="text-xs font-extrabold uppercase text-[#756f65]">
        {isVietnamese ? "Không gian cá nhân" : "Private workspace"}
      </p>
      <h2 className="mt-2 text-2xl font-bold">
        {isVietnamese ? "Đăng nhập để lưu chuyến đi" : "Sign in to save your trips"}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-[#6d675c]">
        {isVietnamese
          ? "Bạn vẫn có thể xem mẫu chuyến đi công khai ở phía trên. Đăng nhập trước khi tạo, dùng AI hoặc lưu lịch trình cá nhân."
          : "You can still browse public templates above. Sign in before creating, using AI, or saving a personal itinerary."}
      </p>
      <Link
        href="/signin?callbackUrl=/"
        className="mt-5 inline-flex rounded-lg bg-[#17211b] px-5 py-3 text-sm font-extrabold text-white"
      >
        {isVietnamese ? "Đăng nhập" : "Sign in"}
      </Link>
    </section>
  );
}

export function LoadingState({ locale }: { locale: Locale }) {
  const text = uiText[locale];

  return (
    <section className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-10 text-center shadow-sm">
      <h2 className="text-2xl font-bold">{text.loadingTitle}</h2>
      <p className="mt-2 text-sm font-medium text-[#6d675c]">{text.loadingBody}</p>
    </section>
  );
}


