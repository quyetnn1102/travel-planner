import { FormEvent, useState } from "react";
import type { TripDraft, TravelStyle } from "@/lib/travel";
import { formatCurrency, formatDate, travelStyles } from "@/lib/travel";
import type { Locale } from "@/lib/i18n";
import { getTimeBlockLabel, getTravelStyleLabel, uiText } from "@/lib/i18n";
import type { AiTripPreview } from "@/lib/ai-recommendations";
import type { TemplateSummary } from "./types";
import { Field, toggleStyle } from "./shared-ui";

export function TemplateStarterPanel({
  templates,
  locale,
  onUseTemplate,
}: {
  templates: TemplateSummary[];
  locale: Locale;
  onUseTemplate: (templateId: string) => void;
}) {
  if (templates.length === 0) {
    return null;
  }

  const isVietnamese = locale === "vi";

  return (
    <section className="rounded-lg border border-white/16 bg-white/12 p-4 text-white backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-white/70">
            {isVietnamese ? "Mẫu có sẵn" : "Ready templates"}
          </p>
          <h2 className="mt-1 text-lg font-extrabold">
            {isVietnamese ? "Bắt đầu từ lịch trình mẫu" : "Start from a proven plan"}
          </h2>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {templates.slice(0, 4).map((template) => (
          <article key={template.id} className="rounded-lg bg-white/12 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold">{template.title}</h3>
                <p className="mt-1 text-xs font-semibold text-white/72">
                  {template.destination} · {template.durationDays} {isVietnamese ? "ngày" : "days"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUseTemplate(template.id)}
                className="rounded-md bg-white px-3 py-1.5 text-xs font-extrabold text-[#17211b]"
              >
                {isVietnamese ? "Dùng mẫu" : "Use"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TripDraftForm({
  draft,
  locale,
  onDraftChange,
  onSubmit,
  isLoading,
}: {
  draft: TripDraft;
  locale: Locale;
  onDraftChange: (draft: TripDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
}) {
  const text = uiText[locale];

  return (
    <form onSubmit={onSubmit} className="m-4 rounded-lg bg-white p-4 shadow-2xl sm:m-6 sm:p-5 lg:m-8">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase text-[#7d776b]">{text.quickCreate}</p>
        <h2 className="mt-1 text-2xl font-bold">{text.createTripTitle}</h2>
      </div>

      <div className="grid gap-3">
        <Field label={text.tripName}>
          <input
            value={draft.title}
            onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
            className="input"
            placeholder="Tokyo gia đình 6N5Đ"
          />
        </Field>
        <Field label={text.destination}>
          <input
            value={draft.destination}
            onChange={(event) => onDraftChange({ ...draft, destination: event.target.value })}
            className="input"
            placeholder="Tokyo, Nhật Bản"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={text.startDate}>
            <input
              type="date"
              value={draft.startDate}
              onChange={(event) => onDraftChange({ ...draft, startDate: event.target.value })}
              className="input"
            />
          </Field>
          <Field label={text.endDate}>
            <input
              type="date"
              value={draft.endDate}
              onChange={(event) => onDraftChange({ ...draft, endDate: event.target.value })}
              className="input"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={text.adults}>
            <input
              type="number"
              min={1}
              value={draft.adultCount}
              onChange={(event) => onDraftChange({ ...draft, adultCount: Number(event.target.value) })}
              className="input"
            />
          </Field>
          <Field label={text.children}>
            <input
              type="number"
              min={0}
              value={draft.childCount}
              onChange={(event) => onDraftChange({ ...draft, childCount: Number(event.target.value) })}
              className="input"
            />
          </Field>
          <Field label={text.budget}>
            <input
              type="number"
              min={0}
              step={500000}
              value={draft.budgetAmount}
              onChange={(event) => onDraftChange({ ...draft, budgetAmount: Number(event.target.value) })}
              className="input"
            />
          </Field>
        </div>
        <StylePicker
          locale={locale}
          selectedStyles={draft.travelStyles}
          onChange={(style) => onDraftChange({ ...draft, travelStyles: toggleStyle(draft.travelStyles, style) })}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-5 w-full rounded-lg bg-[#17211b] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (locale === "vi" ? "AI đang tạo gợi ý..." : "AI generating preview...") : text.createItinerary}
      </button>
    </form>
  );
}


export function TripPreviewPanel({
  draft,
  preview,
  locale,
  onConfirm,
  onCancel,
}: {
  draft: TripDraft;
  preview: AiTripPreview;
  locale: Locale;
  onConfirm: (title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(preview.suggestedTitle);
  const text = uiText[locale];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm(title);
      }}
      className="m-4 max-h-[calc(100vh-14rem)] overflow-y-auto rounded-lg bg-white p-4 shadow-2xl sm:m-6 sm:p-5 lg:m-8"
    >
      <p className="text-xs font-bold uppercase text-[#7d776b]">{text.previewTitle}</p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase text-[#756f65]">{text.previewEditTitleLabel}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase text-[#756f65]">{text.destination}</span>
          <p className="text-sm font-semibold">{draft.destination}</p>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase text-[#756f65]">{text.previewDestinationAbout}</span>
          <p className="text-sm leading-5 text-[#615f57]">{preview.destinationDescription}</p>
        </label>

        <div>
          <p className="mb-2 text-xs font-bold uppercase text-[#756f65]">{text.previewItinerary}</p>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {preview.itineraryPreview.map((day) => (
              <div key={day.dayNumber} className="rounded-lg border border-[#eee5d3] bg-[#fcf9f4] p-3">
                <p className="text-sm font-bold">
                  {`Ngày ${day.dayNumber}`} — {formatDate(day.date)}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#615f57]">{day.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {day.activities.map((activity, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-[#f1eadb] px-2 py-0.5 text-[10px] font-bold text-[#574f42]"
                    >
                      {getTimeBlockLabel(activity.timeBlock, locale)}: {activity.title}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-[#6d675c]">
          <span>
            {draft.startDate} - {draft.endDate}
          </span>
          <span>
            {draft.adultCount + draft.childCount} {locale === "vi" ? "người" : "people"}
          </span>
          <span>{formatCurrency(draft.budgetAmount)}</span>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-[#cfc5b1] px-4 py-3 text-sm font-bold"
        >
          {text.previewBack}
        </button>
        <button type="submit" className="flex-1 rounded-lg bg-[#17211b] px-4 py-3 text-sm font-bold text-white">
          {text.previewConfirm}
        </button>
      </div>
    </form>
  );
}


export function StylePicker({
  locale,
  selectedStyles,
  onChange,
}: {
  locale: Locale;
  selectedStyles: TravelStyle[];
  onChange: (style: TravelStyle) => void;
}) {
  const text = uiText[locale];

  return (
    <fieldset>
      <legend className="mb-2 block text-xs font-bold uppercase text-[#756f65]">{text.travelStyle}</legend>
      <div className="flex flex-wrap gap-2">
        {travelStyles.map((style) => {
          const selected = selectedStyles.includes(style.value);

          return (
            <button
              key={style.value}
              type="button"
              onClick={() => onChange(style.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                selected ? "border-[#17211b] bg-[#17211b] text-white" : "border-[#d4c9b5] bg-[#fffdf8] text-[#6d675c]"
              }`}
            >
              {getTravelStyleLabel(style.value, locale)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

