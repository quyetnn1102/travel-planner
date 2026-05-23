import { useState } from "react";
import type { ChecklistItem, Trip } from "@/lib/travel";
import { Field } from "./shared-ui";

export function ChecklistPanel({
  trip,
  onAdd,
  onUpdate,
  onToggle,
  onDelete,
}: {
  trip: Trip;
  onAdd: (title: string) => void;
  onUpdate: (itemId: string, title: string) => void;
  onToggle: (itemId: string) => void;
  onDelete: (itemId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const doneCount = trip.checklistItems.filter((item) => item.isDone).length;
  const progress = Math.round((doneCount / Math.max(1, trip.checklistItems.length)) * 100);

  return (
    <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-4 shadow-sm">
        <h3 className="text-lg font-bold">Tiến độ chuẩn bị</h3>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">{progress}%</span>
            <span className="font-semibold text-[#6d675c]">
              {doneCount}/{trip.checklistItems.length} mục
            </span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#eadfcb]">
            <div className="h-full rounded-full bg-[#315f45]" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onAdd(title);
            setTitle("");
          }}
          className="mt-5 space-y-3"
        >
          <Field label="Checklist mới">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="input"
              placeholder="Thêm mục cần chuẩn bị"
            />
          </Field>
          <button type="submit" className="w-full rounded-lg bg-[#17211b] px-4 py-3 text-sm font-bold text-white">
            Thêm checklist
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e3dac8] bg-[#fffdf8] shadow-sm">
        {trip.checklistItems.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            onToggle={() => onToggle(item.id)}
            onUpdate={(nextTitle) => onUpdate(item.id, nextTitle)}
            onDelete={() => onDelete(item.id)}
          />
        ))}
      </div>
    </section>
  );
}

export function ChecklistRow({
  item,
  onToggle,
  onUpdate,
  onDelete,
}: {
  item: ChecklistItem;
  onToggle: () => void;
  onUpdate: (title: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(item.title);

  return (
    <div className="flex items-center gap-3 border-b border-[#eee5d3] px-4 py-3 last:border-b-0">
      <input type="checkbox" checked={item.isDone} onChange={onToggle} className="h-5 w-5 accent-[#315f45]" />
      {isEditing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onUpdate(title);
            setIsEditing(false);
          }}
          className="flex min-w-0 flex-1 gap-2"
        >
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="input" />
          <button type="submit" className="rounded-lg bg-[#17211b] px-3 py-2 text-xs font-bold text-white">
            Lưu
          </button>
        </form>
      ) : (
        <p className={`min-w-0 flex-1 text-sm font-semibold ${item.isDone ? "text-[#999185] line-through" : ""}`}>
          {item.title}
        </p>
      )}
      <button type="button" onClick={() => setIsEditing((value) => !value)} className="text-xs font-bold text-[#315f45]">
        Sửa
      </button>
      <button type="button" onClick={onDelete} className="text-xs font-bold text-[#a63f22]">
        Xóa
      </button>
    </div>
  );
}


