"use client";

import type { SnapshotModifierList } from "@/lib/square/types";

const fmt = (cents: number) => "$" + (cents / 100).toFixed(2);

export function ModifierSet({
  list,
  selectedIds,
  onChange,
}: {
  list: SnapshotModifierList;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const isSingle = list.selectionType === "SINGLE";

  const toggle = (id: string) => {
    if (isSingle) {
      onChange([id]);
      return;
    }
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      if (list.maxSelected != null && selectedIds.length >= list.maxSelected) {
        return;
      }
      onChange([...selectedIds, id]);
    }
  };

  const helper = isSingle
    ? "Choose one"
    : list.maxSelected != null
    ? `Up to ${list.maxSelected}`
    : "Choose any";

  return (
    <div className="mb-4">
      <h5 className="flex items-center gap-2 text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-2">
        {list.name}
        <span className="font-semibold normal-case tracking-normal text-romolo-red">
          · {helper}
        </span>
      </h5>
      <div className="flex flex-wrap gap-2">
        {list.modifiers.map((m) => {
          const sel = selectedIds.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                sel
                  ? "bg-romolo-red text-white border-romolo-red"
                  : "bg-romolo-cream text-romolo-warm-gray border-romolo-border hover:border-romolo-red/40"
              }`}
            >
              {m.name}
              {m.priceCents > 0 && (
                <span className="opacity-80">+{fmt(m.priceCents)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
