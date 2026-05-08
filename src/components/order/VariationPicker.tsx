"use client";

import type { SnapshotVariation } from "@/lib/square/types";
import { SectionHeading } from "./SectionHeading";

const fmt = (cents: number) => "$" + (cents / 100).toFixed(2);

export function VariationPicker({
  variations,
  selectedId,
  onSelect,
}: {
  variations: SnapshotVariation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (variations.length === 0) return null;
  const picked = variations.find((v) => v.id === selectedId);
  const state: "required" | "satisfied" =
    picked && picked.inStock ? "satisfied" : "required";

  return (
    <div className="mb-4">
      <SectionHeading label="Size" state={state} />
      <div className="flex flex-wrap gap-2">
        {variations.map((v) => {
          const sel = v.id === selectedId;
          const disabled = !v.inStock;
          return (
            <button
              key={v.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(v.id)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                sel
                  ? "bg-romolo-charcoal text-white border-romolo-charcoal"
                  : disabled
                  ? "bg-black/[0.03] text-[#bdb8b1] border-romolo-border cursor-not-allowed line-through"
                  : "bg-romolo-cream text-romolo-warm-gray border-romolo-border hover:border-romolo-charcoal"
              }`}
            >
              {v.name} · {fmt(v.priceCents)}
              {disabled && <span className="text-[10px]">sold out</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
