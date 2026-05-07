# Cannoli Set — Design

**Date:** 2026-05-07
**Status:** Approved (ready for implementation plan)

## Summary

Add a third Cannoli composite item — **Cannoli Set** — alongside the existing Cannoli and Cannoli Kit composites. A set is a fixed-recipe Ricotta cannoli build (Ricotta filling + Chocolate shell + Mixed garnish) sold in three sizes: 6 Full Size, 12 Full Size, 24 Mini. The user picks one size per line; the recipe and quantity are not user-editable.

Like the other Cannoli composites, the set is synthetic on the frontend and reuses the existing `Cannoli Online - Ricotta` Square item — no new Square item is created.

## Goals

- New "Cannoli Set" entry in the order modal item dropdown, positioned right after Cannoli Kit.
- Three size chips: 6 Full Size, 12 Full Size, 24 Mini. Selecting a chip is the only required input.
- Filling/Shell/Garnish hardcoded and auto-applied to the Square line; not shown to the user.
- Special Notes (free-text) remains visible.
- Pricing = variation price × qty (no set fee).
- Existing cannoli volume discounts apply to set cannolis automatically; set qty stacks with non-set cannoli qty toward thresholds.
- Kitchen identification via line-note prefix (`Set: 12 Full Size`).
- The new "Mixed" garnish option must NOT appear on the regular Cannoli or Cannoli Kit garnish pickers.

## Non-goals

- No filling-type picker on sets (Ricotta only).
- No qty stepper on set lines (one set per line; multi-set via `+ Add another item`).
- No set fee, no fixed set pricing, no Square modifier marker for sets.
- No discount engine changes.
- No ad-hoc Square line item (unlike kits).

## Out-of-app prerequisite (Square catalog)

A new modifier named **`Mixed Garnish`** has been added to the existing **`Cannoli Ricotta Garnish`** modifier list on the Ricotta item. This modifier:

- Lives in the same list as the existing garnish options (Pistachio, Chocolate Chips, Toffee, Cherries).
- Is the per-line auto-applied garnish for set lines.
- Must be hidden from the regular Cannoli and Cannoli Kit garnish pickers (visibility filter described below).

The set composite also auto-applies the `Original` option from `Cannoli Ricotta Filling` (the ricotta-flavor picker) and `Chocolate` from `Cannoli Ricotta Shell`. These are existing options and are NOT reserved — they remain user-pickable on the regular and kit composites.

If any of these options are renamed or removed in Square, the set composite gracefully fails to emit (see Error handling).

## Architecture

### Data model — `src/lib/square/types.ts`

Three new types:

```ts
export type SetOption = {
  key: string;        // stable: "6_full" | "12_full" | "24_mini"
  label: string;      // user-facing AND used as the line-note suffix
  variationId: string;
  qty: number;
  // Captured at catalog-build time (the Ricotta variation is in scope when
  // the option is resolved). Lets the size chip disable itself and
  // lineValid reject the line without a second lookup pass.
  inStock: boolean;
};

export type AutoModifierRef = {
  modifierListId: string;
  modifierId: string;
  // Mirrors the soldOut bit applyLocationSoldOut already populates on the
  // serialized modifier lists, captured at catalog-build time so lineValid
  // can reject a set line if any auto-modifier is sold out without a second
  // lookup pass.
  soldOut?: boolean;
};

export type SetInfo = {
  options: SetOption[];
  autoModifiers: AutoModifierRef[];
};
```

`SnapshotItem` gains `set?: SetInfo`. Three composite-type signals coexist on `SnapshotItem`: `cannoliFillings` (regular), `kit` (kit), `set` (set). Mutually exclusive in practice.

`OrderLine` is unchanged. Set lines reuse existing fields:

| Field         | Set-line value                                                              |
|---------------|-----------------------------------------------------------------------------|
| `itemId`      | `"cannoli-set__composite"`                                                  |
| `fillingKey`  | `undefined` (set has no filling picker)                                     |
| `variationId` | Ricotta variation id from picked `SetOption`; `""` until size picked        |
| `qty`         | `SetOption.qty` after size pick; `0` before                                 |
| `modifiers`   | Pre-seeded at addLine time with the three auto modifier IDs                 |
| `freeText`    | `{ [specialNotesListId]: "" }` (only TEXT list rendered for set lines)      |

### Catalog build — `src/lib/square/catalog.ts`

New constants alongside the existing `KIT_*` and `CANNOLI_*` block:

```ts
const SET_COMPOSITE_NAME = "Cannoli Set";
const SET_COMPOSITE_ID   = "cannoli-set__composite";

// Modifier-list-name suffix → modifier option name. Suffix-based to survive
// list renames like "Cannoli Ricotta Filling" / "Ricotta Filling" the same
// way the existing modifierListRank function does.
const SET_AUTO_MODIFIERS = [
  { listNameSuffix: "filling", modifierName: "Original"      },
  { listNameSuffix: "shell",   modifierName: "Chocolate"     },
  { listNameSuffix: "garnish", modifierName: "Mixed Garnish" },
] as const;

// Variation-name prefix (lowercased) → set option spec.
const SET_OPTION_SPECS = [
  { key: "6_full",  label: "6 Full Size",  variationPrefix: "full", qty: 6  },
  { key: "12_full", label: "12 Full Size", variationPrefix: "full", qty: 12 },
  { key: "24_mini", label: "24 Mini",      variationPrefix: "mini", qty: 24 },
] as const;

// Modifier OPTION names that exist in Square but should NOT surface as user-
// pickable choices on the regular Cannoli or Cannoli Kit composites — they
// are reserved for set-only auto-application.
const SET_RESERVED_MODIFIER_NAMES = new Set<string>(["Mixed Garnish"]);
```

`getCatalog` passes the new constants into `mergeCannoliItems` (signature gains `setCompositeName`, `setCompositeId`, `setAutoModifiers`, `setOptionSpecs`, `setReservedModifierNames`, `specialNotesListNameSuffix`).

### Merge function — `src/lib/square/serializers.ts`

`mergeCannoliItems` now emits up to **three** composites at the position of the first matching underlying filling, in this order:

1. Regular Cannoli composite (existing).
2. Cannoli Kit composite (existing).
3. Cannoli Set composite (new) — only if `buildSetComposite` resolves successfully.

`buildRegularComposite` and `buildKitComposite` get a new helper applied last:

```ts
function stripReservedModifierOptions(
  lists: SnapshotModifierList[],
  reserved: Set<string>,
): SnapshotModifierList[] {
  return lists.map((ml) =>
    ml.modifierType === "list"
      ? { ...ml, modifiers: ml.modifiers.filter((m) => !reserved.has(m.name)) }
      : ml
  );
}
```

This filters the `Mixed` option out of the Garnish list on both regular and kit composites without removing the list itself (the user still picks Sprinkles/Chocolate Chips/etc. on regular cannolis).

`buildSetComposite(ricotta, options)` does:

1. Resolve auto modifiers by walking `ricotta.modifierLists`, matching list-name suffix to find the list, then matching modifier name (case-insensitive, trimmed) within it. Capture `{ modifierListId, modifierId, soldOut }`. Return `null` if any cannot be resolved.
2. Resolve set options: for each `SET_OPTION_SPECS` entry, find the Ricotta variation whose lowercased name starts with `variationPrefix`. Return `null` if any can't be resolved or the variation is not in stock at build time? — **No.** In-stock is dynamic; resolution failure is structural only. Sold-out variations are surfaced via `lineValid` at line-validity time (same as today's kit/regular flow).
3. Resolve Special Notes list: walk Ricotta's modifier lists for a TEXT list whose lowercased name ends with `"special notes"`. Capture it. Return `null` if missing.
4. Build the composite:
   ```ts
   {
     id: SET_COMPOSITE_ID,
     name: SET_COMPOSITE_NAME,
     description: undefined,
     categoryName: ricotta.categoryName,
     variations: [],
     modifierLists: [specialNotesList],   // only Special Notes is rendered
     cannoliFillings: undefined,
     set: { options, autoModifiers },
   }
   ```

If `buildSetComposite` returns `null`, the rest of the menu still works — the composite is simply not emitted. A console warning is logged once at build time so the operator knows the catalog is misconfigured.

## Frontend flow — `src/components/OrderFlow.tsx`

### Helpers (`activeVariations`, `activeModifierLists`)

Both gain a set branch:

- `activeVariations` returns `[]` for set items (size chips replace VariationPicker).
- `activeModifierLists` returns `item.modifierLists` for set items — which contains only Special Notes by construction. (Same expression as the non-composite branch; the set just has a curated `modifierLists`.)

### `lineValid`

New branch for `item.set`:

```ts
if (item.set) {
  if (!line.variationId) return false;
  const opt = item.set.options.find(
    (o) => o.variationId === line.variationId && o.qty === line.qty,
  );
  if (!opt || !opt.inStock) return false;
  if (item.set.autoModifiers.some((am) => am.soldOut)) return false;
  // Fall through to existing Special Notes TEXT validation via the
  // modifierLists loop below — the only list on a set composite.
}
```

Variation in-stock and modifier sold-out flags are captured at catalog-build time and embedded on `SetOption.inStock` / `AutoModifierRef.soldOut` so `lineValid` is self-contained.

### `addLine`, `onItemChange`

When the chosen item has `item.set`:

- `variationId = ""` (user must pick size).
- `qty = 0` (no size picked yet — line is invalid until a chip is clicked).
- `modifiers` pre-seeded with the three auto modifier IDs:
  ```ts
  const seedModifiers: Record<string, string[]> = {};
  for (const am of item.set.autoModifiers) {
    seedModifiers[am.modifierListId] = [am.modifierId];
  }
  ```
  Special Notes is a TEXT list, so it goes into `freeText`, not `modifiers`.
- `freeText` seeded for Special Notes via existing `seedSelectionsForLists(item.modifierLists)`.

### `onSetOptionChange(key)` (new handler)

Mirrors `onFillingChange`:

```ts
const onSetOptionChange = (key: string) => {
  if (!item.set) return;
  const opt = item.set.options.find((o) => o.key === key);
  if (!opt) return;
  onChange({ variationId: opt.variationId, qty: opt.qty });
};
```

`modifiers` and `freeText` do not need re-seeding — they were seeded at addLine and don't change with size.

### Size picker UI

Rendered in `OrderLineEditor` when `item.set` is truthy. Visually mirrors the filling chip row (`OrderFlow.tsx:763-788`) for consistency:

```tsx
{item.set && (
  <div className="mb-4">
    <h5 className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-2">
      Set Size
    </h5>
    <div className="flex flex-wrap gap-2">
      {item.set.options.map((o) => {
        const sel = o.variationId === line.variationId && o.qty === line.qty;
        const disabled = !o.inStock;
        return (
          <button
            key={o.key}
            type="button"
            disabled={disabled}
            onClick={() => onSetOptionChange(o.key)}
            className={/* identical to filling chip styling */}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  </div>
)}
```

Existing renders that should NOT fire for set lines (verified by inspection):

- `VariationPicker` is gated by `variations.length > 1` — set returns `[]`, so skipped.
- Filling chip picker is gated by `item.cannoliFillings` — set has none.
- QtyStepper renders unconditionally; it must be **hidden** for set lines. Add an `item.set ? null : <QtyStepper ... />` guard at `OrderFlow.tsx:741-746`.
- Modifier rendering loop iterates `orderedModifierLists` — set's list contains only Special Notes, so only that field renders. No change needed.

### Submission — order-line note

In the cart-to-API mapping (`OrderFlow.tsx:210-240`), prepend a `Set: <label>` segment to `noteParts`:

```ts
if (item?.set && line.variationId) {
  const opt = item.set.options.find(
    (o) => o.variationId === line.variationId && o.qty === line.qty,
  );
  if (opt) noteParts.unshift(`Set: ${opt.label}`);
}
```

`Object.values(l.modifiers).flat()` flushes the three auto modifier IDs to Square unchanged. No new request schema field. No `kitModifier` field is sent.

### Pricing display — no change

`StepWhat` totalling logic at `OrderFlow.tsx:1025-1060` already iterates `order.lines` and computes subtotal from variation price × qty. Set lines satisfy this naturally. The `kit` branch is skipped (set has no `item.kit`). `computeDiscounts` matches the Ricotta variation against the cannoli pricing rule's product set, so volume discounts auto-apply and stack with non-set cannoli quantities.

## Order route + payload — no change

`src/app/api/orders/route.ts` and `src/lib/square/orders.ts` are untouched. Set lines look like normal cannoli lines from the API's perspective: one `lineItem` with `catalogObjectId` (Ricotta variation), `quantity` (6/12/24), three modifiers, and a note.

## Error handling

| Failure mode                                        | Behavior                                                                 |
|-----------------------------------------------------|--------------------------------------------------------------------------|
| Auto-modifier (Mixed/Chocolate/Ricotta) missing     | `buildSetComposite` returns `null`; set composite not emitted; warn once |
| Set variation (Full Size or Mini) missing           | `buildSetComposite` returns `null`; warn once                            |
| Special Notes list missing on Ricotta               | `buildSetComposite` returns `null`; warn once                            |
| Ricotta variation sold out at order time            | Size chip disabled; line invalid via `inStock` check                     |
| Auto-modifier sold out at order time                | All set chips disabled; `lineValid` returns false                        |
| User submits with malformed line (e.g. qty edited)  | Existing line validation rejects; UI keeps user on Step 1                |

The site does NOT crash if Square is misconfigured. Worst case: Cannoli Set simply isn't in the dropdown.

## Testing

### Unit — `src/lib/square/serializers.test.ts`

New cases under `mergeCannoliItems`:

- Emits Cannoli Set composite when Ricotta has all three auto modifiers and both variation prefixes.
- Drops `Mixed` option from Garnish list on regular Cannoli composite.
- Drops `Mixed` option from Garnish list on Cannoli Kit composite.
- Skips set composite (no error) when `Mixed` modifier is absent from Garnish list.
- Skips set composite when Special Notes list is absent.
- Skips set composite when Mini variation is missing.
- Set composite has `cannoliFillings` undefined and `kit` undefined.
- Set composite's `modifierLists` contains only the Special Notes list.
- Set composite's `set.options[].inStock` reflects the underlying variation's in-stock flag.
- Set composite's `set.autoModifiers[].soldOut` reflects the underlying modifier's sold-out flag.
- Composite emit order: regular → kit → set.

### Unit — `src/lib/square/orders.test.ts`

No new cases needed — set lines pass through `buildOrderPayload` unchanged. (Add a sanity test that asserts a set-shaped line — `kitModifier` undefined, three modifiers, qty 12 — produces a single `lineItem` with three modifiers and no ad-hoc sibling.)

### Integration / manual

- Open order modal, pick "Cannoli Set" → confirm only size chips + Special Notes render.
- Pick a size → Continue enabled.
- Add a regular Cannoli + a 12-pack set → confirm volume discount applies and stacks.
- Submit a sandbox order → verify in Square dashboard that the line shows three modifiers (Ricotta filling, Chocolate shell, Mixed garnish) and a note prefixed `Set: 12 Full Size`.
- Sold-out scenarios: dashboard-toggle Mini → set chip disabled. Dashboard-toggle Mixed garnish → all set chips disabled with message.
- Open the regular Cannoli → confirm Garnish picker does NOT show "Mixed".

## Open questions

None at design-approval time.

## Files changed

- `src/lib/square/types.ts` — add `SetOption`, `AutoModifierRef`, `SetInfo`; add `set?: SetInfo` on `SnapshotItem`.
- `src/lib/square/catalog.ts` — add SET_* constants; thread into `mergeCannoliItems`.
- `src/lib/square/serializers.ts` — add `buildSetComposite`, `stripReservedModifierOptions`; extend `mergeCannoliItems` to emit set composite and apply the strip on regular + kit composites.
- `src/lib/square/serializers.test.ts` — new cases per Testing section.
- `src/lib/square/orders.test.ts` — sanity test for set-shaped lines.
- `src/components/OrderFlow.tsx` — set branch in `activeVariations` / `activeModifierLists`, `lineValid`, `addLine`, `onItemChange`; new `onSetOptionChange`; size picker UI; `qty` stepper guard; note-prefix on submission.
