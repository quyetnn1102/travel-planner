import { useState } from "react";
import type { CostCategory, CostItem, Trip } from "@/lib/travel";
import { calculateCostSummary, costCategories, formatCurrency } from "@/lib/travel";
import type { Locale } from "@/lib/i18n";
import { getCostCategoryLabel } from "@/lib/i18n";
import type { CostDraft } from "./types";
import { emptyCostDraft } from "./defaults";
import { Field, Metric } from "./shared-ui";

export function CostPanel({
  trip,
  summary,
  locale,
  onAdd,
  onUpdate,
  onDelete,
}: {
  trip: Trip;
  summary: ReturnType<typeof calculateCostSummary>;
  locale: Locale;
  onAdd: (draft: CostDraft) => void;
  onUpdate: (costId: string, name: string, amount: number) => void;
  onDelete: (costId: string) => void;
}) {
  const [draft, setDraft] = useState<CostDraft>(emptyCostDraft);
  const isVietnamese = locale === "vi";

  return (
    <section id="budget" className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-4 shadow-sm">
        <h3 className="text-lg font-bold">{isVietnamese ? "Thêm chi phí" : "Add cost"}</h3>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onAdd(draft);
            setDraft(emptyCostDraft);
          }}
          className="mt-4 space-y-3"
        >
          <Field label={isVietnamese ? "Nhóm chi phí" : "Cost category"}>
            <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as CostCategory })} className="input">
              {costCategories.map((category) => (
                <option key={category.value} value={category.value}>
                  {getCostCategoryLabel(category.value, locale)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={isVietnamese ? "Tên chi phí" : "Cost name"}>
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              className="input"
              placeholder={isVietnamese ? "Khách sạn, vé máy bay..." : "Hotel, flights..."}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={isVietnamese ? "Số tiền" : "Amount"}>
              <input
                type="number"
                min={0}
                value={draft.amount}
                onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })}
                className="input"
              />
            </Field>
            <Field label={isVietnamese ? "Số lượng" : "Quantity"}>
              <input
                type="number"
                min={1}
                value={draft.quantity}
                onChange={(event) => setDraft({ ...draft, quantity: Number(event.target.value) })}
                className="input"
              />
            </Field>
          </div>
          <Field label={isVietnamese ? "Ghi chú" : "Notes"}>
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              className="input min-h-20 resize-none"
            />
          </Field>
          <button type="submit" className="w-full rounded-lg bg-[#17211b] px-4 py-3 text-sm font-bold text-white">
            {isVietnamese ? "Thêm chi phí" : "Add cost"}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label={isVietnamese ? "Tổng chi phí" : "Total cost"} value={formatCurrency(summary.total)} />
          <Metric label={isVietnamese ? "Theo người" : "Per person"} value={formatCurrency(summary.perPerson)} />
          <Metric
            label={isVietnamese ? "So với ngân sách" : "Budget delta"}
            value={formatCurrency(summary.budgetDelta)}
            tone={summary.isOverBudget ? "warning" : "default"}
          />
        </div>
        <div className="overflow-hidden rounded-lg border border-[#e3dac8] bg-[#fffdf8] shadow-sm">
          <div className="grid grid-cols-[1.1fr_0.8fr_0.6fr_0.45fr] gap-3 border-b border-[#eee5d3] bg-[#f1eadb] px-4 py-3 text-xs font-bold uppercase text-[#6b6253]">
            <span>{isVietnamese ? "Chi phí" : "Cost"}</span>
            <span>{isVietnamese ? "Nhóm" : "Category"}</span>
            <span className="text-right">{isVietnamese ? "Tổng" : "Total"}</span>
            <span />
          </div>
          {trip.costItems.length > 0 ? (
            trip.costItems.map((item) => (
              <CostRow key={item.id} item={item} locale={locale} onUpdate={onUpdate} onDelete={() => onDelete(item.id)} />
            ))
          ) : (
            <p className="px-4 py-10 text-center text-sm font-medium text-[#776f61]">
              {isVietnamese ? "Chưa có chi phí." : "No costs yet."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export function CostRow({
  item,
  locale,
  onUpdate,
  onDelete,
}: {
  item: CostItem;
  locale: Locale;
  onUpdate: (costId: string, name: string, amount: number) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(item.amount);
  const isVietnamese = locale === "vi";

  if (isEditing) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onUpdate(item.id, name, amount);
          setIsEditing(false);
        }}
        className="grid grid-cols-[1.1fr_0.8fr_0.6fr_0.45fr] items-center gap-3 border-b border-[#eee5d3] px-4 py-3"
      >
        <input value={name} onChange={(event) => setName(event.target.value)} className="input" />
        <span className="text-sm font-semibold text-[#6d675c]">{getCostCategoryLabel(item.category, locale)}</span>
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
          className="input text-right"
        />
        <button type="submit" className="text-right text-xs font-bold text-[#315f45]">
          {isVietnamese ? "Lưu" : "Save"}
        </button>
      </form>
    );
  }

  return (
    <div className="grid grid-cols-[1.1fr_0.8fr_0.6fr_0.45fr] items-center gap-3 border-b border-[#eee5d3] px-4 py-3 text-sm last:border-b-0">
      <div>
        <p className="font-bold">{item.name}</p>
        {item.notes ? <p className="mt-1 text-xs text-[#776f61]">{item.notes}</p> : null}
      </div>
      <span className="font-semibold text-[#6d675c]">{getCostCategoryLabel(item.category, locale)}</span>
      <span className="text-right font-bold">{formatCurrency(item.amount * item.quantity)}</span>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setIsEditing(true)} className="text-xs font-bold text-[#315f45]">
          {isVietnamese ? "Sửa" : "Edit"}
        </button>
        <button type="button" onClick={onDelete} className="text-xs font-bold text-[#a63f22]">
          {isVietnamese ? "Xóa" : "Delete"}
        </button>
      </div>
    </div>
  );
}


