import { useState } from "react";
import type { Trip } from "@/lib/travel";
import { buildPartnerLinks } from "@/lib/integrations";
import type { Locale } from "@/lib/i18n";
import { uiText } from "@/lib/i18n";

export function BookingPanel({ trip, locale }: { trip: Trip; locale: Locale }) {
  const text = uiText[locale].booking;
  const partnerLinks = buildPartnerLinks(trip);

  return (
    <section id="booking" className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-[#756f65]">{text.hotelSearch}</p>
          <h3 className="mt-1 text-xl font-bold">{text.title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6d675c]">{text.subtitle}</p>
        </div>
        <span className="rounded-full bg-[#f1eadb] px-3 py-1 text-xs font-bold text-[#61594a]">
          {trip.startDate} - {trip.endDate}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {partnerLinks.map((partner) => (
          <article key={partner.id} className="rounded-lg border border-[#eee5d3] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-extrabold">{partner.name}</h4>
                <p className="mt-1 text-xs font-bold uppercase text-[#756f65]">
                  {partner.trackingConfigured ? text.configured : text.notConfigured}
                </p>
              </div>
              <span className="rounded-full bg-[#e8f2df] px-3 py-1 text-xs font-bold text-[#315f45]">
                {trip.adultCount + trip.childCount} {uiText[locale].people}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#6d675c]">{partner.note}</p>
            <a
              href={partner.href}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-lg bg-[#17211b] px-4 py-3 text-sm font-bold text-white"
            >
              {text.open}
            </a>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs font-semibold text-[#756f65]">{text.disclosure}</p>
    </section>
  );
}

export function SharePanel({ trip, onToggle }: { trip: Trip; onToggle: () => void }) {
  const [copyStatus, setCopyStatus] = useState("");
  const shareUrl = trip.share ? `/shared/${trip.share.token}` : "";

  return (
    <section id="share" className="max-w-3xl rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold">Link chia sẻ chỉ xem</h3>
          <p className="mt-2 text-sm leading-6 text-[#6d675c]">
            Người nhận link có thể xem lịch trình, chi phí và checklist. Thông tin cá nhân không hiển thị trên trang công khai.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`rounded-lg px-4 py-3 text-sm font-bold ${
            trip.share?.isEnabled ? "bg-[#fee8df] text-[#9b3519]" : "bg-[#17211b] text-white"
          }`}
        >
          {trip.share?.isEnabled ? "Tắt link" : "Bật link"}
        </button>
      </div>

      {trip.share ? (
        <div className="mt-5 rounded-lg border border-[#eee5d3] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#756f65]">
            Trạng thái: {trip.share.isEnabled ? "đang bật" : "đang tắt"}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input readOnly value={shareUrl} className="input flex-1" />
            <button
              type="button"
              disabled={!trip.share.isEnabled}
              onClick={async () => {
                await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`);
                setCopyStatus("Đã copy link");
              }}
              className="rounded-lg bg-[#315f45] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              Copy
            </button>
          </div>
          {copyStatus ? <p className="mt-2 text-sm font-bold text-[#315f45]">{copyStatus}</p> : null}
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-dashed border-[#d4c9b5] px-4 py-6 text-center text-sm font-semibold text-[#776f61]">
          Chưa tạo link chia sẻ.
        </p>
      )}
    </section>
  );
}


