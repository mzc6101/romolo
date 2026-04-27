"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DELIVERY_ZONES,
  MENU_DATA,
  fmt,
  type DeliveryZone,
  type Flavor,
} from "@/lib/data";
import { useOrder } from "./OrderProvider";

type Address = { street: string; apt: string; city: string; zip: string };
type Contact = { name: string; phone: string; email: string };
type FlavorMix = Record<string, number> & { __mixItUp?: number };
type OrderLine = {
  id: string;
  itemId: string;
  qty: number;
  shell: string;
  flavorMix: FlavorMix;
};
type Order = {
  date: string;
  time: string;
  timeAvailable: boolean;
  lines: OrderLine[];
  fulfillment: "pickup" | "delivery" | null;
  zone: DeliveryZone | null;
  address: Address;
  deliveryNotes: string;
  contact: Contact;
  cardOk: boolean;
  confirmation: string;
};

const lineId = () => Math.random().toString(36).slice(2, 8);

const initialOrder = (): Order => ({
  date: "",
  time: "",
  timeAvailable: true,
  lines: [
    { id: lineId(), itemId: "cannoli-mini", qty: 12, shell: "plain", flavorMix: { original: 12 } },
  ],
  fulfillment: null,
  zone: null,
  address: { street: "", apt: "", city: "", zip: "" },
  deliveryNotes: "",
  contact: { name: "", phone: "", email: "" },
  cardOk: false,
  confirmation: "RC-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
});

const flavorsAssigned = (line: OrderLine) => {
  const mix = line.flavorMix || {};
  if (mix.__mixItUp) return true;
  const total = Object.entries(mix)
    .filter(([k]) => k !== "__mixItUp")
    .reduce((a, [, b]) => a + (b as number), 0);
  return total === line.qty;
};

const STEP_LABELS = ["When", "What", "How", "Pay"] as const;

export default function OrderFlow({ flavors }: { flavors: Flavor[] }) {
  const { isOpen, close } = useOrder();
  const [step, setStep] = useState(0);
  const [order, setOrder] = useState<Order>(initialOrder);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setOrder(initialOrder());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const canAdvance = (() => {
    if (step === 0) return !!order.date && !!order.time && order.timeAvailable;
    if (step === 1)
      return order.lines.length > 0 && order.lines.every((l) => l.qty > 0 && flavorsAssigned(l));
    if (step === 2) {
      if (order.fulfillment === "pickup") return true;
      if (order.fulfillment === "delivery")
        return !!order.zone && order.zone.auto && !!order.address.street;
      return false;
    }
    if (step === 3) return order.cardOk;
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
          {step === 1 && <StepWhat order={order} setOrder={setOrder} flavors={flavors} />}
          {step === 2 && <StepHow order={order} setOrder={setOrder} />}
          {step === 3 && <StepPay order={order} setOrder={setOrder} />}
          {step === 4 && <StepDone order={order} onClose={close} />}
        </div>

        {/* Footer */}
        {step < 4 && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6 border-t border-romolo-border bg-romolo-cream">
            <OrderSummary order={order} />
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
                    setStep(4);
                  } else {
                    next();
                  }
                }}
                disabled={!canAdvance}
                className="px-6 py-3 text-[12px] font-bold tracking-[0.15em] uppercase bg-romolo-red text-white hover:bg-romolo-red-dark transition-colors disabled:bg-[#d8d4ce] disabled:cursor-not-allowed rounded-sm"
              >
                {step === 3 ? "Place order" : "Continue"}
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

  const isClosed = (d: Date) => d.getDay() === 1; // Mon closed
  const dayHours = (d: Date) => {
    if (isClosed(d)) return "Closed";
    return d.getDay() === 0 ? "12:00pm – 4:00pm" : "11:00am – 6:00pm";
  };
  const timeSlots = (d: Date | null) => {
    if (!d) return [];
    if (d.getDay() === 0) return ["12:00pm", "12:30pm", "1:00pm", "2:00pm", "3:00pm", "3:30pm"];
    return [
      "11:00am", "11:30am", "12:00pm", "12:30pm", "1:00pm",
      "2:00pm", "3:00pm", "4:00pm", "5:00pm", "5:30pm",
    ];
  };

  const selectedDate = order.date ? new Date(order.date + "T00:00:00") : null;

  return (
    <div>
      <StepHeader
        title="When do you want it?"
        subtitle="We block out closed days and times you can't pick up or be delivered to."
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
              onClick={() => setOrder({ ...order, date: fmtDate(d), time: "", timeAvailable: true })}
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
              <div className="text-[10px] mt-1 opacity-70">{closed ? "Closed" : dayHours(d)}</div>
            </button>
          );
        })}
      </div>

      {selectedDate && !isClosed(selectedDate) && (
        <>
          <h4 className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-3">
            Pick up / delivery time
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
            </a>{" "}
            — we&apos;ll work something out.
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
  flavors,
}: {
  order: Order;
  setOrder: (o: Order) => void;
  flavors: Flavor[];
}) {
  const updateLine = (id: string, patch: Partial<OrderLine>) =>
    setOrder({ ...order, lines: order.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const removeLine = (id: string) =>
    setOrder({ ...order, lines: order.lines.filter((l) => l.id !== id) });
  const addLine = () =>
    setOrder({
      ...order,
      lines: [
        ...order.lines,
        { id: lineId(), itemId: "cannoli-full", qty: 6, shell: "plain", flavorMix: { original: 6 } },
      ],
    });

  return (
    <div>
      <StepHeader
        title="What do you want?"
        subtitle="Mix flavors across an order — six original, two strawberry, two chocolate. Or hit 'You decide' and let us pick."
      />
      <div className="flex flex-col gap-4">
        {order.lines.map((line, idx) => (
          <OrderLineEditor
            key={line.id}
            line={line}
            flavors={flavors}
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
  flavors,
  onChange,
  onRemove,
  index,
}: {
  line: OrderLine;
  flavors: Flavor[];
  onChange: (patch: Partial<OrderLine>) => void;
  onRemove: (() => void) | null;
  index: number;
}) {
  const item = MENU_DATA.flatMap((c) => c.items).find((i) => i.id === line.itemId);
  const isCannoli = line.itemId.startsWith("cannoli-") && line.itemId !== "cannoli-kit";
  const stepSize = line.itemId === "cannoli-kit" ? 6 : 1;
  const minQty = stepSize;
  const totalAssigned = Object.entries(line.flavorMix || {})
    .filter(([k]) => k !== "__mixItUp")
    .reduce((a, [, b]) => a + (b as number), 0);
  const remaining = line.qty - totalAssigned;
  const availableFlavors = flavors.filter((f) => f.available);
  const mixIt = !!line.flavorMix?.__mixItUp;

  const setQty = (q: number) => {
    const clamped = Math.max(minQty, Math.round(q / stepSize) * stepSize);
    let mix: FlavorMix = { ...(line.flavorMix || {}) };
    if (mix.__mixItUp) {
      mix = { __mixItUp: clamped };
    } else {
      let assigned = Object.entries(mix)
        .filter(([k]) => k !== "__mixItUp")
        .reduce((a, [, v]) => a + (v as number), 0);
      while (assigned > clamped) {
        const k = Object.keys(mix)
          .filter((k) => k !== "__mixItUp" && (mix[k] as number) > 0)
          .pop();
        if (!k) break;
        mix[k] = (mix[k] as number) - 1;
        assigned -= 1;
      }
    }
    onChange({ qty: clamped, flavorMix: mix });
  };

  const setFlavorCount = (id: string, n: number) => {
    const next: FlavorMix = { ...(line.flavorMix || {}) };
    delete next.__mixItUp;
    next[id] = Math.max(0, n);
    if (next[id] === 0) delete next[id];
    onChange({ flavorMix: next });
  };

  const enableMix = () => onChange({ flavorMix: { __mixItUp: line.qty } });

  return (
    <div className="border border-romolo-border rounded-sm p-4 bg-white">
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] tracking-[0.15em] uppercase text-romolo-warm-gray mb-1">
            Item {index + 1}
          </div>
          <select
            value={line.itemId}
            onChange={(e) => {
              const id = e.target.value;
              const newStep = id === "cannoli-kit" ? 6 : 1;
              onChange({
                itemId: id,
                qty: newStep,
                flavorMix: id.startsWith("cannoli") ? { original: newStep } : {},
              });
            }}
            className="w-full max-w-[360px] px-4 py-3 bg-romolo-cream border border-romolo-border rounded-sm text-sm text-romolo-charcoal focus:outline-none focus:border-romolo-red/40 appearance-none"
          >
            {MENU_DATA.map((c) => (
              <optgroup key={c.category} label={c.category}>
                {c.items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} — {fmt(i.price)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <QtyStepper qty={line.qty} step={stepSize} min={minQty} onChange={setQty} />
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

      {item && (
        <div className="text-[13px] text-romolo-warm-gray mb-3">
          {item.description} {line.itemId === "cannoli-kit" && "· sold in 6's"}
        </div>
      )}

      {(line.itemId === "cannoli-full" || line.itemId === "cannoli-mini") && (
        <div className="mb-4">
          <h5 className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-2">
            Shell
          </h5>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "plain", label: "Plain" },
              { id: "chocolate-dipped", label: "Chocolate-dipped (+$0.50)" },
              { id: "pistachio-dusted", label: "Pistachio-dusted (+$0.50)" },
            ].map((s) => {
              const sel = line.shell === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => onChange({ shell: s.id })}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    sel
                      ? "bg-romolo-charcoal text-white border-romolo-charcoal"
                      : "bg-romolo-cream text-romolo-warm-gray border-romolo-border hover:border-romolo-charcoal"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(isCannoli || line.itemId === "cannoli-kit") && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h5 className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium m-0">
              Filling{" "}
              <span
                className="font-semibold normal-case tracking-normal"
                style={{
                  color: mixIt
                    ? "var(--color-romolo-red)"
                    : remaining === 0
                    ? "#2da66f"
                    : "var(--color-romolo-red)",
                }}
              >
                · {mixIt ? "you decide" : remaining === 0 ? "all assigned ✓" : `${remaining} of ${line.qty} left to assign`}
              </span>
            </h5>
            <button
              onClick={enableMix}
              className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-[0.1em] uppercase border border-romolo-red transition-colors ${
                mixIt ? "bg-romolo-red text-white" : "bg-transparent text-romolo-red"
              }`}
              title="Default to whatever the team is making today"
            >
              {mixIt ? "✓ You decide" : "Mix it up — you decide"}
            </button>
          </div>

          {!mixIt && (
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
            >
              {availableFlavors.map((f) => {
                const n = (line.flavorMix && (line.flavorMix[f.id] as number)) || 0;
                return (
                  <div
                    key={f.id}
                    className={`flex items-center justify-between gap-2.5 px-3 py-2 border border-romolo-border rounded-sm ${
                      n > 0 ? "bg-romolo-cream" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                        style={{ background: f.color }}
                      />
                      <span className="text-[13px] truncate">{f.name}</span>
                    </div>
                    <QtyStepper
                      qty={n}
                      step={1}
                      min={0}
                      max={remaining + n}
                      onChange={(v) => setFlavorCount(f.id, v)}
                      compact
                    />
                  </div>
                );
              })}
            </div>
          )}

          {mixIt && (
            <div className="p-3.5 bg-romolo-cream border border-dashed border-romolo-border rounded-sm text-[13px] text-romolo-warm-gray italic">
              We&apos;ll fill all {line.qty} with whatever the team picks for the day —
              usually a mix of original ricotta and one rotating flavor. Surprise edition.
            </div>
          )}
        </div>
      )}
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
function StepHow({ order, setOrder }: { order: Order; setOrder: (o: Order) => void }) {
  return (
    <div>
      <StepHeader
        title="How do you want it?"
        subtitle="Pickup is always free. Delivery is auto-priced by distance from the shop."
      />

      <div className="grid grid-cols-2 gap-3 mb-6">
        <FulfillmentCard
          icon="🛍️"
          label="Pickup"
          sub="81 W. 37th Ave, San Mateo"
          selected={order.fulfillment === "pickup"}
          onSelect={() => setOrder({ ...order, fulfillment: "pickup", zone: null })}
        />
        <FulfillmentCard
          icon="🚚"
          label="Delivery"
          sub="3 zones · long-distance by phone"
          selected={order.fulfillment === "delivery"}
          onSelect={() => setOrder({ ...order, fulfillment: "delivery" })}
        />
      </div>

      {order.fulfillment === "pickup" && (
        <div className="p-4 bg-romolo-cream border border-romolo-border rounded-sm">
          <div className="font-[var(--font-serif)] text-lg font-medium mb-1.5">
            81 W. 37th Ave, San Mateo CA 94403
          </div>
          <div className="text-[13px] text-romolo-warm-gray leading-relaxed">
            Look for the red awning. Walk in, give your name, the cannoli are filled while you watch. Free street parking out front.
          </div>
        </div>
      )}

      {order.fulfillment === "delivery" && <DeliveryConfig order={order} setOrder={setOrder} />}
    </div>
  );
}

function FulfillmentCard({
  icon,
  label,
  sub,
  selected,
  onSelect,
}: {
  icon: string;
  label: string;
  sub: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left p-4 rounded-sm border transition-all ${
        selected
          ? "bg-romolo-charcoal text-white border-romolo-charcoal"
          : "bg-white text-romolo-charcoal border-romolo-border hover:border-romolo-charcoal"
      }`}
    >
      <div className="text-[28px] mb-2">{icon}</div>
      <div className="font-[var(--font-serif)] text-[22px] font-medium">{label}</div>
      <div className="text-xs opacity-70 mt-0.5">{sub}</div>
    </button>
  );
}

function DeliveryConfig({ order, setOrder }: { order: Order; setOrder: (o: Order) => void }) {
  const isSunday =
    !!order.date && new Date(order.date + "T00:00:00").getDay() === 0;

  return (
    <div>
      <h5 className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium">
        Delivery zone
      </h5>
      <p className="text-xs text-romolo-warm-gray mb-3 italic mt-1">
        Auto-priced by distance from San Mateo. Long-distance orders (Santa Cruz, Napa, weddings 2+ hrs out) need a phone call so we can plan it together.
      </p>
      <div className="flex flex-col gap-2 mb-5">
        {DELIVERY_ZONES.map((z) => {
          const sel = order.zone?.id === z.id;
          return (
            <button
              key={z.id}
              onClick={() => setOrder({ ...order, zone: z })}
              className={`flex items-center justify-between gap-3.5 px-4 py-3.5 rounded-sm border text-left transition-colors ${
                sel ? "bg-romolo-cream border-romolo-red" : "bg-white border-romolo-border hover:border-romolo-red/40"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-4 h-4 shrink-0 rounded-full border flex items-center justify-center ${
                    sel ? "border-romolo-red" : "border-romolo-border"
                  }`}
                >
                  {sel && <span className="w-2 h-2 bg-romolo-red rounded-full" />}
                </span>
                <div>
                  <div className="font-semibold text-sm">{z.label}</div>
                  <div className="text-xs text-romolo-warm-gray">
                    {z.radius} · {z.eta}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                {z.auto && z.fee != null ? (
                  <div className="font-[var(--font-serif)] text-lg font-semibold text-romolo-red">
                    {fmt(z.fee)}
                  </div>
                ) : (
                  <div className="text-[11px] text-romolo-warm-gray font-bold tracking-[0.1em] uppercase">
                    Call us
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {order.zone && !order.zone.auto && (
        <div
          className="p-4 mb-4 rounded-sm border"
          style={{
            background: "rgba(236, 56, 40, 0.06)",
            borderColor: "rgba(236, 56, 40, 0.25)",
          }}
        >
          <div className="font-[var(--font-serif)] text-[22px] font-medium text-romolo-red mb-1.5">
            Let&apos;s plan this one together.
          </div>
          <p className="text-sm text-romolo-charcoal leading-relaxed mb-3.5">
            Long-distance orders (weddings, corporate events 2+ hours out) are usually $500–$1,000 and we coordinate them by phone so timing, quantity, and route are right.
          </p>
          <a
            href="tel:+16505740625"
            className="inline-block px-5 py-3 text-[12px] font-bold tracking-[0.15em] uppercase bg-romolo-red text-white hover:bg-romolo-red-dark transition-colors rounded-sm"
          >
            Call (650) 574-0625
          </a>
        </div>
      )}

      {order.zone && order.zone.auto && (
        <>
          <h5 className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-2">
            Delivery address
          </h5>
          <div className="grid gap-2.5 mb-2.5" style={{ gridTemplateColumns: "2fr 1fr" }}>
            <input
              className="px-4 py-3 bg-romolo-cream border border-romolo-border rounded-sm text-sm focus:outline-none focus:border-romolo-red/40"
              placeholder="Street address"
              value={order.address.street}
              onChange={(e) => setOrder({ ...order, address: { ...order.address, street: e.target.value } })}
            />
            <input
              className="px-4 py-3 bg-romolo-cream border border-romolo-border rounded-sm text-sm focus:outline-none focus:border-romolo-red/40"
              placeholder="Apt / suite"
              value={order.address.apt}
              onChange={(e) => setOrder({ ...order, address: { ...order.address, apt: e.target.value } })}
            />
          </div>
          <div className="grid gap-2.5 mb-3.5" style={{ gridTemplateColumns: "2fr 1fr" }}>
            <input
              className="px-4 py-3 bg-romolo-cream border border-romolo-border rounded-sm text-sm focus:outline-none focus:border-romolo-red/40"
              placeholder="City"
              value={order.address.city}
              onChange={(e) => setOrder({ ...order, address: { ...order.address, city: e.target.value } })}
            />
            <input
              className="px-4 py-3 bg-romolo-cream border border-romolo-border rounded-sm text-sm focus:outline-none focus:border-romolo-red/40"
              placeholder="ZIP"
              value={order.address.zip}
              onChange={(e) => setOrder({ ...order, address: { ...order.address, zip: e.target.value } })}
            />
          </div>
          <textarea
            className="w-full px-4 py-3 bg-romolo-cream border border-romolo-border rounded-sm text-sm focus:outline-none focus:border-romolo-red/40 resize-y min-h-[110px]"
            placeholder="Delivery notes — gate code, drop-off spot, etc."
            value={order.deliveryNotes}
            onChange={(e) => setOrder({ ...order, deliveryNotes: e.target.value })}
          />
          {isSunday && (
            <div
              className="mt-3.5 px-3.5 py-2.5 rounded-sm border text-[13px]"
              style={{
                background: "#fff8ed",
                borderColor: "#f0d8a8",
                color: "#8a5a18",
              }}
            >
              <strong>Sunday delivery</strong> — $5 surcharge added at checkout.
            </div>
          )}
        </>
      )}

      <div className="mt-4 pt-3.5 border-t border-romolo-border text-[13px] text-romolo-warm-gray">
        Edge case? Call the shop:{" "}
        <a href="tel:+16505740625" className="text-romolo-red underline font-semibold">
          (650) 574-0625
        </a>
      </div>
    </div>
  );
}

// ─────────── Step 4: Pay ───────────
function StepPay({ order, setOrder }: { order: Order; setOrder: (o: Order) => void }) {
  return (
    <div>
      <StepHeader
        title="How would you like to pay?"
        subtitle="Secure checkout via Square. We don't store your card."
      />
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <input
          className="px-4 py-3 bg-romolo-cream border border-romolo-border rounded-sm text-sm focus:outline-none focus:border-romolo-red/40"
          placeholder="Full name"
          value={order.contact.name}
          onChange={(e) => setOrder({ ...order, contact: { ...order.contact, name: e.target.value } })}
        />
        <input
          className="px-4 py-3 bg-romolo-cream border border-romolo-border rounded-sm text-sm focus:outline-none focus:border-romolo-red/40"
          placeholder="Phone"
          value={order.contact.phone}
          onChange={(e) => setOrder({ ...order, contact: { ...order.contact, phone: e.target.value } })}
        />
      </div>
      <input
        className="w-full mb-5 px-4 py-3 bg-romolo-cream border border-romolo-border rounded-sm text-sm focus:outline-none focus:border-romolo-red/40"
        placeholder="Email — for the receipt"
        value={order.contact.email}
        onChange={(e) => setOrder({ ...order, contact: { ...order.contact, email: e.target.value } })}
      />

      <h5 className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-2">
        Card details
      </h5>
      <div className="p-4 border border-romolo-border rounded-sm bg-romolo-cream flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray">
            Square Web Payments
          </span>
          <span className="flex gap-1.5">
            {["VISA", "MC", "AMEX"].map((c) => (
              <span
                key={c}
                className="text-[10px] font-bold px-1.5 py-0.5 bg-white border border-romolo-border rounded text-romolo-warm-gray"
              >
                {c}
              </span>
            ))}
          </span>
        </div>
        <input
          className="w-full px-4 py-3 bg-white border border-romolo-border rounded-sm text-sm focus:outline-none focus:border-romolo-red/40"
          placeholder="Card number"
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            className="px-4 py-3 bg-white border border-romolo-border rounded-sm text-sm focus:outline-none focus:border-romolo-red/40"
            placeholder="MM / YY"
          />
          <input
            className="px-4 py-3 bg-white border border-romolo-border rounded-sm text-sm focus:outline-none focus:border-romolo-red/40"
            placeholder="CVC"
          />
          <input
            className="px-4 py-3 bg-white border border-romolo-border rounded-sm text-sm focus:outline-none focus:border-romolo-red/40"
            placeholder="ZIP"
          />
        </div>
        <label className="text-xs text-romolo-warm-gray flex gap-2 items-center mt-1">
          <input
            type="checkbox"
            checked={order.cardOk}
            onChange={(e) => setOrder({ ...order, cardOk: e.target.checked })}
          />
          I agree to the order — preview only, no real charge.
        </label>
      </div>
    </div>
  );
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
        {order.contact.phone || "you"} when{" "}
        {order.fulfillment === "pickup" ? "it's ready to pick up" : "the driver is on the way"}.
      </p>
      <div className="bg-romolo-cream border border-romolo-border rounded-sm p-4 text-left mb-5">
        <div className="text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray mb-1.5">
          {order.fulfillment === "pickup" ? "Pickup" : "Delivery"}
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

function OrderSummary({ order }: { order: Order }) {
  const subtotal = order.lines.reduce((sum, l) => {
    const item = MENU_DATA.flatMap((c) => c.items).find((i) => i.id === l.itemId);
    return sum + (item ? item.price * l.qty : 0);
  }, 0);
  const deliveryFee =
    order.fulfillment === "delivery" && order.zone?.auto && order.zone.fee != null
      ? order.zone.fee
      : 0;
  const isSunday = !!order.date && new Date(order.date + "T00:00:00").getDay() === 0;
  const sundaySurcharge = order.fulfillment === "delivery" && isSunday ? 5 : 0;
  const total = subtotal + deliveryFee + sundaySurcharge;
  const extras = deliveryFee + sundaySurcharge;

  return (
    <div className="text-[13px] text-romolo-warm-gray leading-tight">
      <div className="text-[11px] tracking-[0.15em] uppercase">Order total</div>
      <div className="font-[var(--font-serif)] text-[22px] font-semibold text-romolo-charcoal">
        {fmt(total)}
        {extras > 0 && (
          <span className="text-xs font-normal text-romolo-warm-gray ml-1.5">
            (incl. {fmt(extras)} delivery)
          </span>
        )}
      </div>
    </div>
  );
}
