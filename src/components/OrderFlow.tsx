"use client";

// Cannoli is rendered as a single composite item in the dropdown ("Cannoli")
// even though Square has Ice Cream and Ricotta as two separate items. The
// frontend filling-type picker switches between them; the active filling
// supplies its own variations + modifier lists. See `mergeCannoliItems` in
// src/lib/square/serializers.ts for how the composite is built.

import { useEffect, useMemo, useState } from "react";
import { useOrder } from "./OrderProvider";
import { VariationPicker } from "./order/VariationPicker";
import { ModifierSet } from "./order/ModifierSet";
import { SquareCard, type SquareCardHandle } from "./order/SquareCard";
import type {
  MenuSnapshot,
  SnapshotItem,
  SnapshotModifierList,
  SnapshotVariation,
} from "@/lib/square/types";

type Contact = { name: string; phone: string; email: string };

type OrderLine = {
  id: string;
  itemId: string;       // SnapshotItem.id
  // Composite-item lines (e.g. Cannoli) carry the picked filling-type key —
  // determines which underlying Square item supplies the variations + mods.
  fillingKey?: string;
  variationId: string;  // SnapshotVariation.id
  qty: number;
  modifiers: Record<string, string[]>; // modifierListId -> selected modifier ids
  freeText: Record<string, string>;    // modifierListId (TEXT) -> entered text
  // Cannoli Set lines only. "default" runs the fixed recipe (Original /
  // Chocolate / Mixed Garnish auto-applied); "customize" exposes the
  // underlying filling's modifier lists for user-driven configuration.
  setMode?: "default" | "customize";
};

function activeVariations(
  item: SnapshotItem,
  fillingKey: string | undefined
): SnapshotVariation[] {
  // Set items expose variation through the size chip picker, not a
  // VariationPicker — so suppress the variation list entirely. The chip
  // picker writes the resolved variationId straight onto the line.
  if (item.set) return [];
  if (item.cannoliFillings) {
    const f = item.cannoliFillings.find((x) => x.key === fillingKey);
    return f?.variations ?? [];
  }
  return item.variations;
}

function activeModifierLists(
  item: SnapshotItem,
  fillingKey: string | undefined,
  setMode?: "default" | "customize"
): SnapshotModifierList[] {
  if (item.set) {
    // Customize: per-filling lists (Shell / Filling / Garnish for Ricotta;
    // Flavor for Ice Cream — already pre-stripped of Multiple Boxes and
    // per-filling Special Notes) plus the top-level Set Special Notes.
    if (setMode === "customize" && fillingKey && item.cannoliFillings) {
      const f = item.cannoliFillings.find((x) => x.key === fillingKey);
      return [...(f?.modifierLists ?? []), ...item.modifierLists];
    }
    // Default: only Special Notes is visible; recipe is auto-applied.
    return item.modifierLists;
  }
  if (item.cannoliFillings) {
    const f = item.cannoliFillings.find((x) => x.key === fillingKey);
    return f?.modifierLists ?? [];
  }
  return item.modifierLists;
}

// Resolves the SetOption matching a line's current variationId+qty. Matches
// either the Ricotta variationId or the Ice Cream equivalent so Customize-
// Ice Cream lines (whose variationId points to an Ice Cream variation) still
// resolve to the right size option.
function findSetOption(
  item: SnapshotItem,
  line: { variationId: string; qty: number }
) {
  return item.set?.options.find(
    (o) =>
      (o.variationId === line.variationId ||
        o.iceCream?.variationId === line.variationId) &&
      o.qty === line.qty
  );
}

// Builds the per-line payload sent to /api/orders and /api/orders/calculate.
// Reused by both place-order submission (StepPay) and totals fetching
// (OrderSummary) so the calculate result and the placed-order total match
// exactly. Note prefix and kit-fee shape live here so any change applies
// to both call sites.
function buildLinePayload(line: OrderLine, snapshot: MenuSnapshot) {
  const item = snapshot.items.find((i) => i.id === line.itemId);
  const noteParts: string[] = [];
  if (item) {
    if (item.set && line.variationId) {
      const opt = findSetOption(item, line);
      if (opt) noteParts.push(`Set: ${opt.label}`);
    }
    for (const ml of activeModifierLists(item, line.fillingKey, line.setMode)) {
      if (ml.modifierType !== "text") continue;
      const text = (line.freeText[ml.id] ?? "").trim();
      if (text.length === 0) continue;
      noteParts.push(`${ml.name}: ${text}`);
    }
  }
  const kitModifier = item?.kit
    ? {
        perKitFeeCents: item.kit.perKitFeeCents,
        count: Math.floor(line.qty / item.kit.groupSize),
        ...(item.kit.modifierId ? { modifierId: item.kit.modifierId } : {}),
      }
    : undefined;
  return {
    catalogObjectId: line.variationId,
    quantity: line.qty,
    modifiers: Object.values(line.modifiers).flat(),
    ...(noteParts.length > 0 ? { note: noteParts.join(" | ") } : {}),
    ...(kitModifier ? { kitModifier } : {}),
  };
}

// Composite items (Cannoli) start with no filling selected — the user must
// pick one before sizes/modifiers render. Non-composite items have no filling
// concept so fillingKey stays undefined for the lifetime of the line.

// Modifier lists render in catalog order by default, which doesn't always
// match the desired UX. Rank them here so:
//   shell → filling → garnish (Ricotta structural choices, in that order)
//   <other lists, in catalog order>     (e.g. Ice Cream Flavor)
//   multiple boxes → special notes      (always last — packing + notes)
// Suffix match so Square renames like "Cannoli Ricotta Shell" / "Cannoli
// Multiple Boxes" still rank correctly. Non-matching lists keep their
// relative order via JavaScript's stable sort.
const modifierListRank = (name: string): number => {
  const lc = name.toLowerCase().trim();
  if (lc.endsWith("shell")) return -3;
  if (lc.endsWith("filling")) return -2;
  if (lc.endsWith("garnish")) return -1;
  if (lc.endsWith("multiple boxes")) return 1;
  if (lc.endsWith("special notes")) return 2;
  return 0;
};

type Order = {
  date: string;
  time: string;
  timeAvailable: boolean;
  lines: OrderLine[];
  fulfillment: "pickup";
  contact: Contact;
  cardOk: boolean;
  confirmation: string;
};

const lineId = () => Math.random().toString(36).slice(2, 8);

// Seed defaults for a fresh OrderLine: leaves required SINGLE-list selections
// empty (user must pick) so the "required" enforcement works, but pre-fills
// nothing for optional / TEXT / MULTIPLE lists. For set items the caller
// also passes the auto-applied modifier refs so they ride along on the
// line and flush to Square at submit even though no UI surfaces them.
function seedSelectionsForLists(
  modifierLists: SnapshotModifierList[],
  autoModifiers: ReadonlyArray<{ modifierListId: string; modifierId: string }> = [],
) {
  const modifiers: Record<string, string[]> = {};
  const freeText: Record<string, string> = {};
  for (const ml of modifierLists) {
    if (ml.modifierType === "text") {
      freeText[ml.id] = "";
    } else {
      modifiers[ml.id] = [];
    }
  }
  for (const am of autoModifiers) {
    modifiers[am.modifierListId] = [am.modifierId];
  }
  return { modifiers, freeText };
}

// Computes the initial OrderLine state for a freshly added or item-swapped
// line. Three composite types: filling-picker (Cannoli), kit (qty enforced
// to groupSize), set (size chips drive variation+qty after selection).
// Non-composite items preselect the first in-stock variation.
function buildLineSeedForItem(item: SnapshotItem) {
  if (item.set) {
    // Set: variation + qty are picked via size chip; modifiers list contains
    // only Special Notes (TEXT). Auto modifiers (Filling/Shell/Garnish) ride
    // along in line.modifiers so they flush to Square at submit unchanged.
    // Lines start in Default mode — the "Cannoli Options" chip toggles to
    // Customize.
    const { modifiers, freeText } = seedSelectionsForLists(
      item.modifierLists,
      item.set.autoModifiers,
    );
    return {
      variationId: "",
      qty: 0,
      modifiers,
      freeText,
      setMode: "default" as const,
    };
  }
  if (item.cannoliFillings) {
    // Composite: filling stays unselected until user picks it; variation and
    // modifier lists become available once a filling is chosen.
    return {
      variationId: "",
      qty: item.kit ? item.kit.groupSize : 1,
      modifiers: {},
      freeText: {},
      setMode: undefined,
    };
  }
  const firstVariation =
    item.variations.find((v) => v.inStock) ?? item.variations[0];
  const { modifiers, freeText } = seedSelectionsForLists(item.modifierLists);
  return {
    variationId: firstVariation?.id ?? "",
    qty: item.kit ? item.kit.groupSize : 1,
    modifiers,
    freeText,
    setMode: undefined,
  };
}

const initialOrder = (): Order => ({
  date: "",
  time: "",
  timeAvailable: true,
  lines: [],
  fulfillment: "pickup",
  contact: { name: "", phone: "", email: "" },
  cardOk: false,
  confirmation: "",
});

const fmtCents = (c: number) => "$" + (c / 100).toFixed(2);

const lineValid = (line: OrderLine, snapshot: MenuSnapshot): boolean => {
  const item = snapshot.items.find((i) => i.id === line.itemId);
  if (!item) return false;
  // Filling pick is required for non-set composites (regular Cannoli, Kit)
  // and for set lines in Customize mode. Default-mode set lines have no
  // filling concept.
  if (!item.set && item.cannoliFillings && !line.fillingKey) return false;
  if (item.kit) {
    // Kit lines must be in whole groups (a kit covers exactly groupSize
    // cannolis). The qty stepper enforces this in the UI, but a paste or
    // manual edit could land on an off-step value.
    if (line.qty < item.kit.groupSize) return false;
    if (line.qty % item.kit.groupSize !== 0) return false;
  }
  if (item.set) {
    // Set lines must match exactly one of the predefined size options.
    // In Customize mode the variationId can also match the Ice Cream side
    // of the option; findSetOption handles both. inStock is checked
    // against the side actually in use.
    if (!line.variationId) return false;
    if (line.setMode === "customize" && !line.fillingKey) return false;
    const opt = findSetOption(item, line);
    if (!opt) return false;
    const sideInStock =
      line.setMode === "customize" && line.fillingKey === "ice_cream"
        ? !!opt.iceCream?.inStock
        : opt.inStock;
    if (!sideInStock) return false;
    // Default mode: auto-applied modifiers must not be sold out. Customize
    // mode replaces the auto-recipe with user picks, so soldOut on the
    // default modifiers is irrelevant — required-list enforcement below
    // catches anything else the user must pick.
    if (
      line.setMode !== "customize" &&
      item.set.autoModifiers.some((am) => am.soldOut)
    ) {
      return false;
    }
  }
  const variations = activeVariations(item, line.fillingKey);
  const modifierLists = activeModifierLists(item, line.fillingKey, line.setMode);
  // Set lines satisfy the variation in-stock check above; activeVariations
  // returns [] for set items, so skip the standard variation lookup.
  if (!item.set) {
    const variation = variations.find((v) => v.id === line.variationId);
    if (!variation || !variation.inStock) return false;
  }
  for (const ml of modifierLists) {
    if (ml.modifierType === "text") {
      const text = (line.freeText[ml.id] ?? "").trim();
      if (ml.minSelected > 0 && text.length === 0) return false;
      if (ml.maxLength != null && text.length > ml.maxLength) return false;
      continue;
    }
    const sel = line.modifiers[ml.id] ?? [];
    if (sel.length < ml.minSelected) return false;
    if (ml.maxSelected != null && sel.length > ml.maxSelected) return false;
    // If a previously selected modifier was marked sold-out by Square (likely
    // via the catalog.version.updated webhook between page open and Continue),
    // the line is invalid until the user picks a different option.
    for (const id of sel) {
      const mod = ml.modifiers.find((m) => m.id === id);
      if (mod?.soldOut) return false;
    }
  }
  return line.qty > 0;
};

const STEP_LABELS = ["When", "What", "How", "Pay"] as const;

export default function OrderFlow() {
  const { isOpen, close, snapshot } = useOrder();
  const [step, setStep] = useState(0);
  const [order, setOrder] = useState<Order>(initialOrder);
  const [cardHandle, setCardHandle] = useState<SquareCardHandle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setOrder(initialOrder());
      setCardHandle(null);
      setSubmitting(false);
      setErrorBanner(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const placeOrder = async () => {
    if (!cardHandle || submitting) return;
    setSubmitting(true);
    setErrorBanner(null);

    const tokenResult = await cardHandle.tokenize();
    if ("error" in tokenResult) {
      setErrorBanner(tokenResult.error);
      setSubmitting(false);
      return;
    }

    const pickupAt = new Date(`${order.date}T${convert12to24(order.time)}:00`).toISOString();

    // Fresh key per attempt: Square idempotency returns the same response for
    // the same key, so reusing it after a decline would echo the decline
    // instead of charging a new card.
    const idempotencyKey = crypto.randomUUID();

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idempotencyKey,
        sourceId: tokenResult.token,
        pickupAt,
        contact: order.contact,
        lines: order.lines.map((l) => buildLinePayload(l, snapshot)),
      }),
    });

    const result = await res.json();
    setSubmitting(false);

    if (result.status === "ok") {
      setOrder({ ...order, confirmation: result.confirmation });
      setStep(4);
      return;
    }
    if (result.status === "card_declined") {
      setErrorBanner(`Card declined: ${result.message}. Please try another card.`);
      return;
    }
    if (result.status === "out_of_stock") {
      setErrorBanner("One of your items just sold out. Remove it to continue.");
      setStep(1);
      return;
    }
    setErrorBanner("Something went wrong. Please call us at (650) 574-0625.");
  };

  const canAdvance = (() => {
    if (step === 0) return !!order.date && !!order.time && order.timeAvailable;
    if (step === 1)
      return (
        order.lines.length > 0 &&
        order.lines.every((l) => lineValid(l, snapshot))
      );
    if (step === 2) return order.fulfillment === "pickup";
    if (step === 3)
      return (
        order.cardOk &&
        !!cardHandle &&
        !!order.contact.email &&
        !!order.contact.name
      );
    return false;
  })();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 backdrop-blur-md"
      style={{ background: "rgba(20, 18, 16, 0.55)", animation: "overlay-in 0.3s var(--ease-out-expo)" }}
      role="dialog"
      aria-modal="true"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-md w-full flex flex-col overflow-hidden"
        style={{
          maxWidth: step === 4 ? 520 : 760,
          maxHeight: "90vh",
          animation: "overlay-pop 0.4s var(--ease-out-expo)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6 border-b border-romolo-border">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="font-[var(--font-serif)] text-xl sm:text-[22px] font-semibold text-romolo-red whitespace-nowrap">
              Romolo&apos;s
            </div>
            {step < 4 && (
              <Stepper
                steps={STEP_LABELS as unknown as string[]}
                current={step}
                onJump={(i) => i < step && setStep(i)}
              />
            )}
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="text-2xl leading-none text-romolo-warm-gray hover:text-romolo-charcoal transition-colors p-1"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7 sm:py-7">
          {step === 0 && <StepWhen order={order} setOrder={setOrder} />}
          {step === 1 && <StepWhat order={order} setOrder={setOrder} />}
          {step === 2 && <StepHow order={order} />}
          {step === 3 && (
            <StepPay
              order={order}
              setOrder={setOrder}
              setCardHandle={setCardHandle}
              errorBanner={errorBanner}
            />
          )}
          {step === 4 && <StepDone order={order} onClose={close} />}
        </div>

        {/* Footer */}
        {step < 4 && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6 border-t border-romolo-border bg-romolo-cream">
            <OrderSummary order={order} snapshot={snapshot} />
            <div className="flex gap-2.5">
              {step > 0 && (
                <button
                  onClick={back}
                  className="px-5 py-3 text-[12px] font-bold tracking-[0.15em] uppercase border border-romolo-border text-romolo-charcoal hover:border-romolo-red hover:text-romolo-red transition-colors rounded-sm"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (step === 3) {
                    placeOrder();
                  } else {
                    next();
                  }
                }}
                disabled={!canAdvance || submitting}
                className="px-6 py-3 text-[12px] font-bold tracking-[0.15em] uppercase bg-romolo-red text-white hover:bg-romolo-red-dark transition-colors disabled:bg-[#d8d4ce] disabled:cursor-not-allowed rounded-sm"
              >
                {step === 3 ? (submitting ? "Placing..." : "Place order") : "Continue"}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes overlay-pop {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

function Stepper({
  steps,
  current,
  onJump,
}: {
  steps: string[];
  current: number;
  onJump?: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => onJump?.(i)}
            className="flex items-center gap-2 bg-transparent p-0"
            style={{ cursor: i < current ? "pointer" : "default" }}
          >
            <span
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-[var(--font-serif)] text-sm transition-all ${
                i === current
                  ? "bg-romolo-red text-white border border-romolo-red"
                  : i < current
                  ? "bg-romolo-charcoal text-white border border-romolo-charcoal"
                  : "bg-white text-romolo-warm-gray border border-romolo-border"
              }`}
            >
              {i < current ? "✓" : i + 1}
            </span>
            <span
              className={`hidden sm:inline text-[12px] tracking-[0.12em] uppercase ${
                i === current ? "text-romolo-charcoal font-semibold" : "text-romolo-warm-gray"
              }`}
            >
              {s}
            </span>
          </button>
          {i < steps.length - 1 && (
            <span className="block w-3 sm:w-6 h-px bg-romolo-border" />
          )}
        </div>
      ))}
    </div>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h3 className="font-[var(--font-serif)] text-[28px] sm:text-[30px] font-light text-romolo-charcoal mb-1.5">
        {title}
      </h3>
      {subtitle && <p className="text-sm text-romolo-warm-gray m-0">{subtitle}</p>}
    </div>
  );
}

// ─────────── Step 1: When ───────────
function StepWhen({ order, setOrder }: { order: Order; setOrder: (o: Order) => void }) {
  const { snapshot } = useOrder();
  const today = new Date();
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dayPeriods = (d: Date) =>
    snapshot.hours.byWeekday[d.getDay()] ?? [];
  const isClosed = (d: Date) => dayPeriods(d).length === 0;
  const dayHoursLabel = (d: Date) => {
    const periods = dayPeriods(d);
    if (periods.length === 0) return "Closed";
    const fmt12 = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      const ampm = h >= 12 ? "pm" : "am";
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, "0")}${ampm}`;
    };
    return periods
      .map((p) => `${fmt12(p.openLocal)} – ${fmt12(p.closeLocal)}`)
      .join(", ");
  };

  const timeSlots = (d: Date | null): string[] => {
    if (!d) return [];
    const periods = dayPeriods(d);
    const slots: string[] = [];
    const fmt12 = (h: number, m: number) => {
      const ampm = h >= 12 ? "pm" : "am";
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, "0")}${ampm}`;
    };
    for (const p of periods) {
      const [sh, sm] = p.openLocal.split(":").map(Number);
      const [eh, em] = p.closeLocal.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      for (let t = startMin; t + 30 <= endMin; t += 30) {
        slots.push(fmt12(Math.floor(t / 60), t % 60));
      }
    }
    return slots;
  };

  const selectedDate = order.date ? new Date(order.date + "T00:00:00") : null;

  return (
    <div>
      <StepHeader
        title="When do you want it?"
        subtitle="We block out closed days and times you can't pick up."
      />

      <h4 className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-3">
        Choose a day
      </h4>
      <div
        className="grid gap-2 mb-7"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}
      >
        {days.map((d) => {
          const closed = isClosed(d);
          const sel = order.date === fmtDate(d);
          return (
            <button
              key={fmtDate(d)}
              disabled={closed}
              onClick={() =>
                setOrder({ ...order, date: fmtDate(d), time: "", timeAvailable: true })
              }
              className={`px-2 py-3 rounded-sm text-center transition-all border ${
                sel
                  ? "bg-romolo-charcoal text-white border-romolo-charcoal"
                  : closed
                  ? "bg-black/[0.03] text-[#bdb8b1] border-romolo-border cursor-not-allowed"
                  : "bg-white text-romolo-charcoal border-romolo-border hover:border-romolo-red/40"
              }`}
            >
              <div className="text-[10px] tracking-[0.15em] uppercase mb-0.5 opacity-70">
                {d.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div className="font-[var(--font-serif)] text-[22px] font-medium leading-none">
                {d.getDate()}
              </div>
              <div className="text-[10px] mt-1 opacity-70">
                {closed ? "Closed" : dayHoursLabel(d)}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDate && !isClosed(selectedDate) && (
        <>
          <h4 className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-3">
            Pick up time
          </h4>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}
          >
            {timeSlots(selectedDate).map((t) => {
              const sel = order.time === t;
              return (
                <button
                  key={t}
                  onClick={() => setOrder({ ...order, time: t, timeAvailable: true })}
                  className={`py-2.5 rounded-sm text-[13px] font-medium transition-all border ${
                    sel
                      ? "bg-romolo-red text-white border-romolo-red"
                      : "bg-white text-romolo-charcoal border-romolo-border hover:border-romolo-red/40"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-romolo-warm-gray mt-4 italic">
            Need a window outside our hours? Call us at{" "}
            <a href="tel:+16505740625" className="text-romolo-red underline">
              (650) 574-0625
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
}

// ─────────── Step 2: What ───────────
function StepWhat({
  order,
  setOrder,
}: {
  order: Order;
  setOrder: (o: Order) => void;
}) {
  const { snapshot } = useOrder();

  const updateLine = (id: string, patch: Partial<OrderLine>) =>
    setOrder({
      ...order,
      lines: order.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });
  const removeLine = (id: string) =>
    setOrder({ ...order, lines: order.lines.filter((l) => l.id !== id) });

  const addLine = () => {
    const firstItem = snapshot.items[0];
    if (!firstItem) return;
    const seed = buildLineSeedForItem(firstItem);
    setOrder({
      ...order,
      lines: [
        ...order.lines,
        {
          id: lineId(),
          itemId: firstItem.id,
          fillingKey: undefined,
          ...seed,
        },
      ],
    });
  };

  // Auto-add a first line when modal opens with empty cart
  if (order.lines.length === 0 && snapshot.items.length > 0) {
    setTimeout(addLine, 0);
  }

  return (
    <div>
      <StepHeader
        title="What do you want?"
        subtitle="Pick items, sizes, and any options. Add as many as you'd like."
      />
      <div className="flex flex-col gap-4">
        {order.lines.map((line, idx) => (
          <OrderLineEditor
            key={line.id}
            line={line}
            onChange={(patch) => updateLine(line.id, patch)}
            onRemove={order.lines.length > 1 ? () => removeLine(line.id) : null}
            index={idx}
          />
        ))}
      </div>
      <button
        onClick={addLine}
        className="mt-4 px-5 py-3 text-[12px] font-bold tracking-[0.15em] uppercase border border-romolo-border text-romolo-charcoal hover:border-romolo-red hover:text-romolo-red transition-colors rounded-sm"
      >
        + Add another item
      </button>
    </div>
  );
}

function OrderLineEditor({
  line,
  onChange,
  onRemove,
  index,
}: {
  line: OrderLine;
  onChange: (patch: Partial<OrderLine>) => void;
  onRemove: (() => void) | null;
  index: number;
}) {
  const { snapshot } = useOrder();
  const item = snapshot.items.find((i) => i.id === line.itemId);
  if (!item) return null;
  const variations = activeVariations(item, line.fillingKey);
  const modifierLists = activeModifierLists(item, line.fillingKey, line.setMode);
  const orderedModifierLists = [...modifierLists].sort(
    (a, b) => modifierListRank(a.name) - modifierListRank(b.name),
  );

  const onItemChange = (id: string) => {
    const next = snapshot.items.find((i) => i.id === id);
    if (!next) return;
    const seed = buildLineSeedForItem(next);
    onChange({
      itemId: id,
      fillingKey: undefined,
      ...seed,
    });
  };

  const onFillingChange = (key: string) => {
    if (!item.cannoliFillings) return;
    const filling = item.cannoliFillings.find((f) => f.key === key);
    if (!filling) return;
    // For the regular Cannoli composite the user picks Full or Mini, so
    // size stays unselected. For the Kit composite there's only Full Size
    // — VariationPicker doesn't render at all in that case, so we have to
    // auto-select or `lineValid` would never pass.
    const autoVariationId =
      filling.variations.length === 1 ? filling.variations[0].id : "";
    const { modifiers: seedModifiers, freeText: seedFreeText } =
      seedSelectionsForLists(filling.modifierLists);
    onChange({
      fillingKey: key,
      variationId: autoVariationId,
      modifiers: seedModifiers,
      freeText: seedFreeText,
    });
  };

  const onSetOptionChange = (key: string) => {
    if (!item.set) return;
    const opt = item.set.options.find((o) => o.key === key);
    if (!opt) return;
    // In Customize → Ice Cream the line tracks the Ice Cream variation; the
    // Ricotta variation is used otherwise.
    const variationId =
      line.setMode === "customize" && line.fillingKey === "ice_cream"
        ? (opt.iceCream?.variationId ?? "")
        : opt.variationId;
    onChange({ variationId, qty: opt.qty });
  };

  // Toggling between Default and Customize. Default reverts to the auto-
  // recipe (variationId snaps back to Ricotta for the current size, modifier
  // selections clear except for the autoModifier seed). Customize switches
  // into Ricotta filling with the auto-recipe pre-filled as a normal user
  // selection — they can change anything from there.
  const onSetModeChange = (mode: "default" | "customize") => {
    if (!item.set) return;
    if (mode === line.setMode) return;
    const opt = findSetOption(item, line);
    if (mode === "default") {
      const ricottaVarId = opt?.variationId ?? "";
      const { modifiers, freeText } = seedSelectionsForLists(
        item.modifierLists,
        item.set.autoModifiers,
      );
      onChange({
        setMode: "default",
        fillingKey: undefined,
        variationId: ricottaVarId,
        modifiers,
        freeText,
      });
      return;
    }
    // mode === "customize"
    const ricotta = item.cannoliFillings?.find((f) => f.key === "ricotta");
    if (!ricotta) return;
    const ricottaVarId = opt?.variationId ?? "";
    const { modifiers, freeText } = seedSelectionsForLists(
      [...ricotta.modifierLists, ...item.modifierLists],
      item.set.autoModifiers,
    );
    onChange({
      setMode: "customize",
      fillingKey: "ricotta",
      variationId: ricottaVarId,
      modifiers,
      freeText,
    });
  };

  // Filling-type chip on a Customize-mode set line. Switching wipes all
  // modifier selections (the pre-fill recipe is Ricotta-specific and has no
  // Ice Cream analogue) and re-resolves the variationId to the new filling's
  // equivalent for the current size.
  const onSetFillingChange = (key: string) => {
    if (!item.set || line.setMode !== "customize") return;
    const filling = item.cannoliFillings?.find((f) => f.key === key);
    if (!filling) return;
    const opt = findSetOption(item, line);
    const newVariationId =
      key === "ice_cream"
        ? (opt?.iceCream?.variationId ?? "")
        : (opt?.variationId ?? "");
    const { modifiers, freeText } = seedSelectionsForLists(
      [...filling.modifierLists, ...item.modifierLists],
      key === "ricotta" ? item.set.autoModifiers : [],
    );
    onChange({
      fillingKey: key,
      variationId: newVariationId,
      modifiers,
      freeText,
    });
  };

  return (
    <div className="border border-romolo-border rounded-sm p-4 bg-white">
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] tracking-[0.15em] uppercase text-romolo-warm-gray mb-1">
            Item {index + 1}
          </div>
          <select
            value={line.itemId}
            onChange={(e) => onItemChange(e.target.value)}
            className="w-full max-w-[360px] px-4 py-3 bg-romolo-cream border border-romolo-border rounded-sm text-sm text-romolo-charcoal focus:outline-none focus:border-romolo-red/40 appearance-none"
          >
            {snapshot.items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Set lines have a fixed qty per size option (6/12/24); the size
              chip picker below carries the qty selection, so the stepper
              would be misleading. */}
          {!item.set && (
            <QtyStepper
              qty={line.qty}
              step={item.kit ? item.kit.groupSize : 1}
              min={item.kit ? item.kit.groupSize : 1}
              onChange={(v) => onChange({ qty: v })}
            />
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              aria-label="Remove"
              className="text-romolo-warm-gray hover:text-romolo-red text-lg p-1.5"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {item.description && (
        <div className="text-[13px] text-romolo-warm-gray mb-3">{item.description}</div>
      )}

      {item.cannoliFillings && !item.set && (
        <div className="mb-4">
          <h5 className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-2">
            Filling
          </h5>
          <div className="flex flex-wrap gap-2">
            {item.cannoliFillings.map((f) => {
              const sel = f.key === line.fillingKey;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => onFillingChange(f.key)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    sel
                      ? "bg-romolo-charcoal text-white border-romolo-charcoal"
                      : "bg-romolo-cream text-romolo-warm-gray border-romolo-border hover:border-romolo-charcoal"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {item.set && (
        <div className="mb-4">
          <h5 className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-2">
            Set Size
          </h5>
          <div className="flex flex-wrap gap-2">
            {item.set.options.map((o) => {
              const sel =
                (o.variationId === line.variationId ||
                  o.iceCream?.variationId === line.variationId) &&
                o.qty === line.qty;
              const disabled =
                line.setMode === "customize" && line.fillingKey === "ice_cream"
                  ? !o.iceCream?.inStock
                  : !o.inStock;
              return (
                <button
                  key={o.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSetOptionChange(o.key)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    disabled
                      ? "bg-romolo-cream/60 text-romolo-warm-gray/50 border-romolo-border line-through cursor-not-allowed"
                      : sel
                        ? "bg-romolo-charcoal text-white border-romolo-charcoal"
                        : "bg-romolo-cream text-romolo-warm-gray border-romolo-border hover:border-romolo-charcoal"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {item.set && item.cannoliFillings && (
        <div className="mb-4">
          <h5 className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-2">
            Cannoli Options
          </h5>
          <div className="flex flex-wrap gap-2">
            {(["default", "customize"] as const).map((mode) => {
              const sel = (line.setMode ?? "default") === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onSetModeChange(mode)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    sel
                      ? "bg-romolo-charcoal text-white border-romolo-charcoal"
                      : "bg-romolo-cream text-romolo-warm-gray border-romolo-border hover:border-romolo-charcoal"
                  }`}
                >
                  {mode === "default" ? "Default" : "Customize"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {item.set && line.setMode === "customize" && item.cannoliFillings && (
        <div className="mb-4">
          <h5 className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-2">
            Filling
          </h5>
          <div className="flex flex-wrap gap-2">
            {item.cannoliFillings.map((f) => {
              const sel = f.key === line.fillingKey;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => onSetFillingChange(f.key)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    sel
                      ? "bg-romolo-charcoal text-white border-romolo-charcoal"
                      : "bg-romolo-cream text-romolo-warm-gray border-romolo-border hover:border-romolo-charcoal"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {variations.length > 1 && (
        <VariationPicker
          variations={variations}
          selectedId={line.variationId}
          onSelect={(id) => onChange({ variationId: id })}
        />
      )}

      {orderedModifierLists.map((ml) => (
        <ModifierSet
          key={ml.id}
          list={ml}
          selectedIds={line.modifiers[ml.id] ?? []}
          onChange={(ids) =>
            onChange({ modifiers: { ...line.modifiers, [ml.id]: ids } })
          }
          text={line.freeText[ml.id] ?? ""}
          onTextChange={(value) =>
            onChange({ freeText: { ...line.freeText, [ml.id]: value } })
          }
        />
      ))}
    </div>
  );
}

function QtyStepper({
  qty,
  step = 1,
  min = 0,
  max,
  onChange,
  compact,
}: {
  qty: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  compact?: boolean;
}) {
  const sz = compact ? 26 : 32;
  const dec = qty - step < min;
  const inc = max != null && qty + step > max;
  return (
    <div
      className="inline-flex items-center border border-romolo-border rounded-full bg-white"
      style={{ height: sz }}
    >
      <button
        onClick={() => onChange(Math.max(min, qty - step))}
        disabled={dec}
        style={{ width: sz, height: sz }}
        className={`text-base ${dec ? "text-[#c0bbb3] cursor-not-allowed" : "text-romolo-charcoal hover:bg-romolo-cream"}`}
      >
        −
      </button>
      <span
        className="text-center text-[13px] font-semibold tabular-nums"
        style={{ minWidth: compact ? 26 : 36 }}
      >
        {qty}
      </span>
      <button
        onClick={() => (max != null ? onChange(Math.min(max, qty + step)) : onChange(qty + step))}
        disabled={inc}
        style={{ width: sz, height: sz }}
        className={`text-base ${inc ? "text-[#c0bbb3] cursor-not-allowed" : "text-romolo-charcoal hover:bg-romolo-cream"}`}
      >
        +
      </button>
    </div>
  );
}

// ─────────── Step 3: How ───────────
function StepHow({ order }: { order: Order }) {
  return (
    <div>
      <StepHeader
        title="How do you want it?"
        subtitle="Pickup at the shop. Walk in, give your name, the cannoli are filled while you watch."
      />

      <div className="p-5 bg-romolo-cream border border-romolo-border rounded-sm">
        <div className="text-[28px] mb-2">🛍️</div>
        <div className="font-[var(--font-serif)] text-[22px] font-medium mb-1.5">
          81 W. 37th Ave, San Mateo CA 94403
        </div>
        <div className="text-[13px] text-romolo-warm-gray leading-relaxed mb-3">
          Look for the red awning. Free street parking out front.
        </div>
        <div className="text-[13px] text-romolo-charcoal">
          <strong>Pickup window:</strong>{" "}
          {order.date && order.time ? `${order.date} at ${order.time}` : "—"}
        </div>
      </div>

      <p className="text-xs text-romolo-warm-gray mt-4 italic">
        Need delivery for an event? Call us at{" "}
        <a href="tel:+16505740625" className="text-romolo-red underline">
          (650) 574-0625
        </a>
        .
      </p>
    </div>
  );
}

// ─────────── Step 4: Pay ───────────
function StepPay({
  order,
  setOrder,
  setCardHandle,
  errorBanner,
}: {
  order: Order;
  setOrder: (o: Order) => void;
  setCardHandle: (h: SquareCardHandle | null) => void;
  errorBanner: string | null;
}) {
  return (
    <div>
      <StepHeader
        title="How would you like to pay?"
        subtitle="Secure checkout via Square. We don't store your card."
      />
      {errorBanner && (
        <div
          className="mb-5 px-4 py-3 rounded-sm border text-sm"
          style={{
            background: "rgba(236, 56, 40, 0.06)",
            borderColor: "rgba(236, 56, 40, 0.4)",
            color: "var(--color-romolo-red)",
          }}
        >
          {errorBanner}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <input
          className="px-4 py-3 bg-romolo-cream border border-romolo-border rounded-sm text-sm focus:outline-none focus:border-romolo-red/40"
          placeholder="Full name"
          value={order.contact.name}
          onChange={(e) =>
            setOrder({ ...order, contact: { ...order.contact, name: e.target.value } })
          }
        />
        <input
          className="px-4 py-3 bg-romolo-cream border border-romolo-border rounded-sm text-sm focus:outline-none focus:border-romolo-red/40"
          placeholder="Phone"
          value={order.contact.phone}
          onChange={(e) =>
            setOrder({ ...order, contact: { ...order.contact, phone: e.target.value } })
          }
        />
      </div>
      <input
        className="w-full mb-5 px-4 py-3 bg-romolo-cream border border-romolo-border rounded-sm text-sm focus:outline-none focus:border-romolo-red/40"
        placeholder="Email — for the receipt"
        type="email"
        value={order.contact.email}
        onChange={(e) =>
          setOrder({ ...order, contact: { ...order.contact, email: e.target.value } })
        }
      />

      <h5 className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-2">
        Card details
      </h5>
      <SquareCard onReady={(h) => setCardHandle(h)} />

      <label className="text-xs text-romolo-warm-gray flex gap-2 items-center mt-3">
        <input
          type="checkbox"
          checked={order.cardOk}
          onChange={(e) => setOrder({ ...order, cardOk: e.target.checked })}
        />
        I agree to the order — my card will be charged on submit.
      </label>
    </div>
  );
}

function convert12to24(t: string): string {
  // "11:30am" -> "11:30"; "1:00pm" -> "13:00"
  const m = t.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!m) return "00:00";
  let h = Number(m[1]);
  const min = m[2];
  const ampm = m[3].toLowerCase();
  if (ampm === "pm" && h !== 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

function StepDone({ order, onClose }: { order: Order; onClose: () => void }) {
  const prettyDate = (s: string) => {
    if (!s) return "";
    const d = new Date(s + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };
  return (
    <div className="text-center pt-3 pb-2">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-romolo-red text-white flex items-center justify-center text-3xl">
        ✓
      </div>
      <h3 className="font-[var(--font-serif)] text-3xl font-light mb-2">
        Grazie, {order.contact.name || "friend"}.
      </h3>
      <p className="text-romolo-warm-gray mb-5">
        Order{" "}
        <strong className="text-romolo-charcoal">{order.confirmation}</strong> is in. We&apos;ll text{" "}
        {order.contact.phone || "you"} when it&apos;s ready to pick up.
      </p>
      <div className="bg-romolo-cream border border-romolo-border rounded-sm p-4 text-left mb-5">
        <div className="text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray mb-1.5">
          Pickup
        </div>
        <div className="font-semibold">
          {prettyDate(order.date)} · {order.time}
        </div>
      </div>
      <button
        className="px-7 py-3 text-[12px] font-bold tracking-[0.15em] uppercase bg-romolo-red text-white hover:bg-romolo-red-dark transition-colors rounded-sm"
        onClick={onClose}
      >
        Back to the site
      </button>
    </div>
  );
}

type CalculatedTotals = {
  subtotalCents: number;
  kitFeeCents: number;
  discountCents: number;
  totalCents: number;
  applied: Array<{ name: string; amountCents: number }>;
};

function OrderSummary({ order, snapshot }: { order: Order; snapshot: MenuSnapshot }) {
  // Server-side totals: only valid lines participate. Square (via
  // /api/orders/calculate) is the authoritative source for subtotal,
  // discounts, and grand total — the frontend never recomputes pricing
  // logic. Last-known totals are kept across in-flight fetches so the
  // footer doesn't blink while the user is mid-edit.
  const [totals, setTotals] = useState<CalculatedTotals | null>(null);

  const payloadKey = useMemo(() => {
    const valid = order.lines.filter((l) => lineValid(l, snapshot));
    if (valid.length === 0) return null;
    return JSON.stringify(valid.map((l) => buildLinePayload(l, snapshot)));
  }, [order.lines, snapshot]);

  // Aggregate kit count from valid lines for the "Cannoli Kit × N" caption.
  // Cheap derivation; not worth round-tripping through Square just to label.
  const kitCount = useMemo(() => {
    let n = 0;
    for (const l of order.lines) {
      const item = snapshot.items.find((i) => i.id === l.itemId);
      if (!item?.kit) continue;
      if (!lineValid(l, snapshot)) continue;
      n += Math.floor(l.qty / item.kit.groupSize);
    }
    return n;
  }, [order.lines, snapshot]);

  useEffect(() => {
    if (!payloadKey) {
      setTotals(null);
      return;
    }
    const ac = new AbortController();
    // 300ms debounce: chip toggles fire several state updates in a row;
    // wait for the user to settle before round-tripping to Square.
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch("/api/orders/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines: JSON.parse(payloadKey) }),
          signal: ac.signal,
        });
        const data = await res.json();
        if (data.status === "ok") {
          setTotals({
            subtotalCents: data.subtotalCents,
            kitFeeCents: data.kitFeeCents,
            discountCents: data.discountCents,
            totalCents: data.totalCents,
            applied: data.applied ?? [],
          });
        }
        // On non-ok responses we silently keep last-known totals; the user
        // can still hit Continue and the place-order request will surface
        // any real error inline.
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          // Network failure: keep last-known totals.
        }
      }
    }, 300);
    return () => {
      clearTimeout(timeout);
      ac.abort();
    };
  }, [payloadKey]);

  const subtotalCents = totals?.subtotalCents ?? 0;
  const kitFeeCents = totals?.kitFeeCents ?? 0;
  const discountCents = totals?.discountCents ?? 0;
  const totalCents = totals?.totalCents ?? 0;
  const applied = totals?.applied ?? [];
  const showBreakdown = discountCents > 0 || kitFeeCents > 0;

  return (
    <div className="text-[13px] text-romolo-warm-gray leading-tight">
      {showBreakdown ? (
        <>
          <div className="flex items-baseline justify-between gap-3 text-[11px]">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmtCents(subtotalCents)}</span>
          </div>
          {applied.map(({ name, amountCents }) => (
            <div
              key={name}
              className="flex items-baseline justify-between gap-3 text-[11px] text-romolo-red"
              title={name}
            >
              <span className="truncate max-w-[180px]">{name}</span>
              <span className="tabular-nums">−{fmtCents(amountCents)}</span>
            </div>
          ))}
          {kitFeeCents > 0 && (
            <div className="flex items-baseline justify-between gap-3 text-[11px]">
              <span>Cannoli Kit{kitCount > 1 ? ` × ${kitCount}` : ""}</span>
              <span className="tabular-nums">+{fmtCents(kitFeeCents)}</span>
            </div>
          )}
          <div className="text-[11px] tracking-[0.15em] uppercase mt-1">Total</div>
          <div className="font-[var(--font-serif)] text-[22px] font-semibold text-romolo-charcoal leading-none">
            {fmtCents(totalCents)}
          </div>
        </>
      ) : (
        <>
          <div className="text-[11px] tracking-[0.15em] uppercase">Order total</div>
          <div className="font-[var(--font-serif)] text-[22px] font-semibold text-romolo-charcoal">
            {fmtCents(totalCents)}
          </div>
        </>
      )}
    </div>
  );
}
