"use client";

import { useMemo } from "react";
import type { SnapshotVariation } from "@/lib/square/types";

const fmt = (cents: number) => "$" + (cents / 100).toFixed(2);

// Variations whose Square names follow "<form-factor> - <size>" (e.g.
// "Full Size - Set of 6", "Mini Size - Single", "Kit - Set of 6") are split
// into a two-level picker: form-factor first, then size. Anything else falls
// back to a flat pill list.
type Parsed = { form: string; size: string };
function parseVariation(name: string): Parsed | null {
  const m = name.match(/^\s*(.+?)\s+-\s+(.+?)\s*$/);
  if (!m) return null;
  return { form: m[1], size: m[2] };
}

export function VariationPicker({
  variations,
  selectedId,
  onSelect,
}: {
  variations: SnapshotVariation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const parsed = variations.map((v) => ({
      v,
      parsed: parseVariation(v.name),
    }));
    if (parsed.length === 0) return null;
    if (parsed.some((p) => p.parsed == null)) return null;

    const order: string[] = [];
    const map = new Map<string, Array<{ v: SnapshotVariation; size: string }>>();
    for (const { v, parsed: p } of parsed) {
      if (!p) continue;
      if (!map.has(p.form)) {
        map.set(p.form, []);
        order.push(p.form);
      }
      map.get(p.form)!.push({ v, size: p.size });
    }
    if (order.length < 2) return null;
    return order.map((form) => ({ form, sizes: map.get(form)! }));
  }, [variations]);

  if (variations.length === 0) return null;

  if (grouped) {
    const selected = variations.find((v) => v.id === selectedId);
    const selectedForm = selected ? parseVariation(selected.name)?.form : null;
    const activeForm =
      selectedForm ??
      grouped.find((g) => g.sizes.some((s) => s.v.inStock))?.form ??
      grouped[0].form;
    const activeGroup = grouped.find((g) => g.form === activeForm)!;

    const pickFirstInForm = (form: string) => {
      const g = grouped.find((x) => x.form === form);
      if (!g) return;
      const inStock = g.sizes.find((s) => s.v.inStock);
      const target = inStock ?? g.sizes[0];
      if (target) onSelect(target.v.id);
    };

    return (
      <div className="mb-4">
        <h5 className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-2">
          Type
        </h5>
        <div className="flex flex-wrap gap-2 mb-3">
          {grouped.map((g) => {
            const sel = g.form === activeForm;
            const allSoldOut = g.sizes.every((s) => !s.v.inStock);
            return (
              <button
                key={g.form}
                type="button"
                disabled={allSoldOut}
                onClick={() => pickFirstInForm(g.form)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  sel
                    ? "bg-romolo-charcoal text-white border-romolo-charcoal"
                    : allSoldOut
                    ? "bg-black/[0.03] text-[#bdb8b1] border-romolo-border cursor-not-allowed line-through"
                    : "bg-romolo-cream text-romolo-warm-gray border-romolo-border hover:border-romolo-charcoal"
                }`}
              >
                {g.form}
              </button>
            );
          })}
        </div>

        <h5 className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-2">
          Size
        </h5>
        <div className="flex flex-wrap gap-2">
          {activeGroup.sizes.map(({ v, size }) => {
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
                    ? "bg-romolo-red text-white border-romolo-red"
                    : disabled
                    ? "bg-black/[0.03] text-[#bdb8b1] border-romolo-border cursor-not-allowed line-through"
                    : "bg-romolo-cream text-romolo-warm-gray border-romolo-border hover:border-romolo-red/40"
                }`}
              >
                {size} · {fmt(v.priceCents)}
                {disabled && <span className="text-[10px]">sold out</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <h5 className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-2">
        Size
      </h5>
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
