"use client";

import type { SnapshotModifierList } from "@/lib/square/types";
import { SectionHeading } from "./SectionHeading";

const fmt = (cents: number) => "$" + (cents / 100).toFixed(2);

// Display-only label cleanup. The "Cannoli " prefix on Square's
// "Cannoli Multiple Boxes" list reads chunky in uppercase tracked caps and
// is redundant under a Cannoli-related item. Kitchen-ticket notes still
// emit the raw Square name elsewhere.
function displayListName(name: string): string {
  if (name.toLowerCase().trim().endsWith("multiple boxes")) {
    return "Multiple Boxes";
  }
  return name;
}

export function ModifierSet({
  list,
  selectedIds,
  onChange,
  text,
  onTextChange,
}: {
  list: SnapshotModifierList;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  text?: string;
  onTextChange?: (value: string) => void;
}) {
  if (list.modifierType === "text") {
    const required = list.minSelected > 0;
    const filled = (text ?? "").trim().length > 0;
    const state: "required" | "satisfied" | "optional" = required
      ? filled
        ? "satisfied"
        : "required"
      : "optional";
    return (
      <div className="mb-4">
        <SectionHeading label={displayListName(list.name)} state={state} />
        <textarea
          value={text ?? ""}
          onChange={(e) => onTextChange?.(e.target.value)}
          maxLength={list.maxLength}
          rows={3}
          className="w-full px-3 py-2 bg-white border border-romolo-border rounded-sm text-sm text-romolo-charcoal focus:outline-none focus:border-romolo-red/40 resize-none"
          placeholder="Add a note for the kitchen…"
        />
        {list.maxLength != null && (
          <div className="mt-1 text-[10px] text-romolo-warm-gray text-right">
            {(text ?? "").length}/{list.maxLength}
          </div>
        )}
      </div>
    );
  }

  const isSingle = list.selectionType === "SINGLE";

  const toggle = (id: string) => {
    if (isSingle) {
      // SINGLE-select with an optional list (minSelected === 0): allow deselect.
      if (selectedIds.includes(id) && list.minSelected === 0) {
        onChange([]);
      } else {
        onChange([id]);
      }
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

  const required = list.minSelected > 0;
  // A required pick is satisfied when the user has met minSelected and none
  // of the chosen modifiers have flipped to sold-out since selection.
  const enoughPicked = selectedIds.length >= Math.max(1, list.minSelected);
  const anySoldOut = selectedIds.some(
    (id) => list.modifiers.find((m) => m.id === id)?.soldOut === true,
  );
  const state: "required" | "satisfied" | "optional" = required
    ? enoughPicked && !anySoldOut
      ? "satisfied"
      : "required"
    : "optional";

  return (
    <div className="mb-4">
      <SectionHeading label={displayListName(list.name)} state={state} />
      <div className="flex flex-wrap gap-2">
        {list.modifiers.map((m) => {
          const sel = selectedIds.includes(m.id);
          const soldOut = m.soldOut === true;
          // Disable only when not currently selected — if the user had a
          // stale selection from before the sold-out flip, leave the button
          // tappable so they can switch off it. Single-select lists then
          // auto-replace; multi-select needs an explicit deselect path
          // (toggle handles this).
          const disabled = soldOut && !sel;
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (soldOut && !sel) return;
                toggle(m.id);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                sel
                  ? "bg-romolo-red text-white border-romolo-red"
                  : soldOut
                  ? "bg-black/[0.03] text-[#bdb8b1] border-romolo-border cursor-not-allowed line-through"
                  : "bg-romolo-cream text-romolo-warm-gray border-romolo-border hover:border-romolo-red/40"
              }`}
            >
              {m.name}
              {m.priceCents > 0 && !soldOut && (
                <span className="opacity-80">+{fmt(m.priceCents)}</span>
              )}
              {soldOut && <span className="text-[10px]">sold out</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
