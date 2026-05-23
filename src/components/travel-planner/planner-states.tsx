import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { uiText } from "@/lib/i18n";

export function EmptyState() {
  return (
    <section className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-10 text-center shadow-sm">
      <h2 className="text-2xl font-bold">Chưa có chuyến đi</h2>
      <p className="mt-2 text-sm font-medium text-[#6d675c]">Tạo chuyến đi đầu tiên từ khung tìm kiếm phía trên.</p>
    </section>
  );
}

export function GuestDashboardState({ locale }: { locale: Locale }) {
  const isVietnamese = locale === "vi";

  return (
    <section className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-10 text-center shadow-sm">
      <p className="text-xs font-extrabold uppercase text-[#756f65]">
        {isVietnamese ? "Khong gian ca nhan" : "Private workspace"}
      </p>
      <h2 className="mt-2 text-2xl font-bold">
        {isVietnamese ? "Dang nhap de luu chuyen di" : "Sign in to save your trips"}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-[#6d675c]">
        {isVietnamese
          ? "Ban van co the xem mau chuyen di cong khai o phia tren. Dang nhap truoc khi tao, dung AI hoac luu lich trinh ca nhan."
          : "You can still browse public templates above. Sign in before creating, using AI, or saving a personal itinerary."}
      </p>
      <Link
        href="/signin?callbackUrl=/"
        className="mt-5 inline-flex rounded-lg bg-[#17211b] px-5 py-3 text-sm font-extrabold text-white"
      >
        {isVietnamese ? "Dang nhap" : "Sign in"}
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


