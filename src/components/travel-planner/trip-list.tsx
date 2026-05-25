import { useState } from "react";
import type { ItineraryDay, Trip, TripDraft, TimeBlock } from "@/lib/travel";
import { calculateCostSummary, formatCurrency, formatDate, timeBlocks } from "@/lib/travel";
import type { AiRecommendation } from "@/lib/ai-recommendations";
import type { Locale } from "@/lib/i18n";
import { getTimeBlockLabel, getTravelStyleLabel, uiText } from "@/lib/i18n";
import type { Tab } from "./types";
import { Field, Metric, toggleStyle } from "./shared-ui";
import { StylePicker } from "./trip-creation";

export function TripListCard({
  trip,
  image,
  locale,
  selected,
  onSelect,
}: {
  trip: Trip;
  image: string;
  locale: Locale;
  selected: boolean;
  onSelect: () => void;
}) {
  const summary = calculateCostSummary(trip);
  const text = uiText[locale];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full overflow-hidden rounded-lg border bg-white text-left transition ${
        selected ? "border-[#17211b] shadow-md" : "border-[#e3dac8] hover:border-[#9e9789]"
      }`}
    >
      <div
        className="h-24 bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.22)), url(${image})` }}
      />
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold">{trip.title}</p>
            <p className="mt-1 text-xs font-semibold text-[#69665d]">{trip.destination}</p>
          </div>
          <span className="rounded-full bg-[#f1eadb] px-2 py-1 text-xs font-bold text-[#574f42]">
            {trip.itineraryDays.length} {text.days}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-[#69665d]">
          <span>{formatDate(trip.startDate)}</span>
          <span>{formatCurrency(summary.total)}</span>
        </div>
      </div>
    </button>
  );
}

export function TripOverview({
  trip,
  summary,
  completedChecklist,
  locale,
  onEdit,
  onDelete,
}: {
  trip: Trip;
  summary: ReturnType<typeof calculateCostSummary>;
  completedChecklist: number;
  locale: Locale;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const text = uiText[locale];

  return (
    <section
      className="overflow-hidden rounded-lg bg-[#17211b] bg-cover bg-center text-white shadow-sm"
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgba(23,33,27,0.92), rgba(23,33,27,0.72), rgba(23,33,27,0.24)), url(https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80)",
      }}
    >
      <div className="p-5 sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-white/78">{trip.destination}</p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">{trip.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/78">
              {trip.notes || text.notesEmpty}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {trip.travelStyles.map((style) => (
                <span key={style} className="rounded-full bg-white/16 px-3 py-1.5 text-xs font-bold text-white">
                  {getTravelStyleLabel(style, locale)}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onEdit} className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#17211b]">
              {text.edit}
            </button>
            <button type="button" onClick={onDelete} className="rounded-lg bg-[#fee8df] px-4 py-2 text-sm font-bold text-[#9b3519]">
              {text.delete}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Metric label={text.time} value={`${trip.itineraryDays.length} ${text.days}`} dark />
          <Metric label={text.travelerCount} value={`${trip.adultCount + trip.childCount} ${text.people}`} dark />
          <Metric label={text.cost} value={formatCurrency(summary.total)} dark />
          <Metric label={text.checklist} value={`${completedChecklist}/${trip.checklistItems.length}`} dark />
        </div>
      </div>
    </section>
  );
}

export function TripEditPanel({
  trip,
  locale,
  onCancel,
  onSave,
}: {
  trip: Trip;
  locale: Locale;
  onCancel: () => void;
  onSave: (draft: TripDraft) => void;
}) {
  const [draft, setDraft] = useState<TripDraft>({
    title: trip.title,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    adultCount: trip.adultCount,
    childCount: trip.childCount,
    budgetAmount: trip.budgetAmount,
    travelStyles: trip.travelStyles,
    notes: trip.notes,
  });
  const text = uiText[locale];

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
      className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-4 shadow-sm"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Field label={text.tripName}>
          <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="input" />
        </Field>
        <Field label={text.destination}>
          <input
            value={draft.destination}
            onChange={(event) => setDraft({ ...draft, destination: event.target.value })}
            className="input"
          />
        </Field>
        <Field label={text.startDate}>
          <input
            type="date"
            value={draft.startDate}
            onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
            className="input"
          />
        </Field>
        <Field label={text.endDate}>
          <input
            type="date"
            value={draft.endDate}
            onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
            className="input"
          />
        </Field>
        <Field label={text.adults}>
          <input
            type="number"
            min={1}
            value={draft.adultCount}
            onChange={(event) => setDraft({ ...draft, adultCount: Number(event.target.value) })}
            className="input"
          />
        </Field>
        <Field label={text.children}>
          <input
            type="number"
            min={0}
            value={draft.childCount}
            onChange={(event) => setDraft({ ...draft, childCount: Number(event.target.value) })}
            className="input"
          />
        </Field>
        <Field label={`${text.budget} VND`}>
          <input
            type="number"
            min={0}
            value={draft.budgetAmount}
            onChange={(event) => setDraft({ ...draft, budgetAmount: Number(event.target.value) })}
            className="input"
          />
        </Field>
        <Field label={locale === "vi" ? "Ghi chu" : "Notes"}>
          <textarea
            value={draft.notes}
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            className="input min-h-20 resize-none"
          />
        </Field>
      </div>
      <div className="mt-4">
        <StylePicker
          locale={locale}
          selectedStyles={draft.travelStyles}
          onChange={(style) => setDraft({ ...draft, travelStyles: toggleStyle(draft.travelStyles, style) })}
        />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-[#cfc5b1] bg-white px-4 py-2 text-sm font-bold">
          {locale === "vi" ? "Huy" : "Cancel"}
        </button>
        <button type="submit" className="rounded-lg bg-[#17211b] px-4 py-2 text-sm font-bold text-white">
          {locale === "vi" ? "Luu thay doi" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export function Tabs({ activeTab, locale, onChange }: { activeTab: Tab; locale: Locale; onChange: (tab: Tab) => void }) {
  const text = uiText[locale];
  const tabs: Array<[Tab, string]> = [
    ["itinerary", text.tabs.itinerary],
    ["costs", text.tabs.costs],
    ["checklist", text.tabs.checklist],
    ["booking", text.tabs.booking],
    ["share", text.tabs.share],
  ];

  return (
    <nav className="flex gap-2 overflow-x-auto rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-2 shadow-sm">
      {tabs.map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
            activeTab === value ? "bg-[#17211b] text-white" : "text-[#625d51] hover:bg-[#f1eadb]"
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

export function AiRecommendationsPanel({
  recommendations,
  isLoading,
  locale,
  onGenerate,
  itineraryDays,
  onAddAsActivity,
}: {
  recommendations: AiRecommendation[];
  isLoading: boolean;
  locale: Locale;
  onGenerate: () => void;
  itineraryDays: ItineraryDay[];
  onAddAsActivity: (dayId: string, timeBlock: TimeBlock, recommendation: AiRecommendation) => void;
}) {
  const isVietnamese = locale === "vi";

  return (
    <section className="rounded-lg border border-[#d8cfbd] bg-[#fffdf8] p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-[#756f65]">
            {isVietnamese ? "AI gá»£i Ã½" : "AI recommendations"}
          </p>
          <h3 className="mt-1 text-lg font-extrabold">
            {isVietnamese ? "Nháº­n gá»£i Ã½ tá»‘i Æ°u lá»‹ch trÃ¬nh" : "Get trip optimization ideas"}
          </h3>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading}
          className="rounded-lg bg-[#17211b] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (isVietnamese ? "Äang táº¡o..." : "Generating...") : isVietnamese ? "Táº¡o gá»£i Ã½" : "Generate"}
        </button>
      </div>

      {recommendations.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {recommendations.map((item) => (
            <RecommendationCard
              key={`${item.priority}-${item.title}`}
              recommendation={item}
              itineraryDays={itineraryDays}
              locale={locale}
              onAddAsActivity={onAddAsActivity}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function RecommendationCard({
  recommendation,
  itineraryDays,
  locale,
  onAddAsActivity,
}: {
  recommendation: AiRecommendation;
  itineraryDays: ItineraryDay[];
  locale: Locale;
  onAddAsActivity: (dayId: string, timeBlock: TimeBlock, recommendation: AiRecommendation) => void;
}) {
  const [selectedDayId, setSelectedDayId] = useState(itineraryDays[0]?.id ?? "");

  return (
    <article className="rounded-lg border border-[#eee5d3] bg-white p-3">
      <span className="rounded-full bg-[#f1eadb] px-2 py-1 text-[11px] font-bold uppercase text-[#574f42]">
        {recommendation.priority}
      </span>
      <h4 className="mt-3 text-sm font-extrabold text-[#17211b]">{recommendation.title}</h4>
      <p className="mt-2 text-sm leading-5 text-[#615f57]">{recommendation.rationale}</p>

      {itineraryDays.length > 0 ? (
        <div className="mt-3 border-t border-[#eee5d3] pt-3">
          <label className="mb-2 block text-xs font-bold uppercase text-[#756f65]">
            {locale === "vi" ? "Chá»n ngÃ y" : "Select day"}
          </label>
          <select
            value={selectedDayId}
            onChange={(event) => setSelectedDayId(event.target.value)}
            className="input mb-2"
          >
            {itineraryDays.map((day) => (
              <option key={day.id} value={day.id}>
                {day.title} â€” {formatDate(day.date)}
              </option>
            ))}
          </select>

          <div className="flex gap-1">
            {timeBlocks.map((block) => (
              <button
                key={block.value}
                type="button"
                onClick={() => onAddAsActivity(selectedDayId, block.value, recommendation)}
                className="flex-1 rounded-md bg-[#f1eadb] px-2 py-1.5 text-[11px] font-bold text-[#574f42] transition hover:bg-[#315f45] hover:text-white"
              >
                {getTimeBlockLabel(block.value, locale)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

