"use client";

// Shared heading for every option section in the order modal (filling chips,
// set size, modifier lists, free-text notes). Drives a three-way visual:
//   required (unmet) → red dot pip on the left
//   satisfied        → charcoal check on the left
//   optional         → no pip, lowercase muted "optional" tag after the label
// Replaces the previous per-component "· Choose one" / "· Optional" red text.
export function SectionHeading({
  label,
  state,
}: {
  label: string;
  state: "required" | "satisfied" | "optional";
}) {
  return (
    <h5 className="flex items-center gap-2 text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-2">
      {state === "required" && (
        <span
          aria-label="Required, not selected"
          className="text-romolo-red text-[9px] leading-none"
        >
          ●
        </span>
      )}
      {state === "satisfied" && (
        <span
          aria-label="Selected"
          className="text-romolo-charcoal text-[11px] leading-none"
        >
          ✓
        </span>
      )}
      <span>{label}</span>
      {state === "optional" && (
        <span className="normal-case font-normal tracking-normal text-romolo-warm-gray/70 text-[11px]">
          optional
        </span>
      )}
    </h5>
  );
}
