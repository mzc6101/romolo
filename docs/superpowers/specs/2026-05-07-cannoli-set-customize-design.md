# Cannoli Set — Default vs Customize toggle

**Date:** 2026-05-07
**Status:** Design
**Builds on:** [2026-05-07-cannoli-set-design.md](./2026-05-07-cannoli-set-design.md)

## Summary

Add a "Cannoli Options" picker below "Set Size" on the Cannoli Set item with two
choices: **Default** (current fixed-recipe behavior, preselected) and
**Customize** (user configures the set like a regular Cannoli line).

## Motivation

The Cannoli Set today is a fixed Ricotta build (Original / Chocolate / Mixed
Garnish) at four sizes. Customers who want a set-sized order with a different
flavor or shell currently can't get one — they'd have to use the regular
Cannoli flow and lose the "set" framing in the kitchen / on receipts. Customize
keeps the set semantics (size lock, line note, volume discount) while exposing
the underlying modifier lists.

## UI

Below the existing Set Size chip picker:

```
Set Size:        [6 Full]  [12 Full]  [12 Mini]  [24 Mini]
Cannoli Options: [Default]  [Customize]
```

`Default` is preselected on every new Set line.

### Default mode (unchanged from today)

- Auto-recipe: Filling=Original, Shell=Chocolate, Garnish=Mixed Garnish
- Only `Cannoli Special Notes` (text) is visible
- Qty stepper hidden
- Line note prefixed `Set: <label>` (e.g. `Set: 12 Mini`)

### Customize mode

A filling-type chip picker appears, then per-filling modifier lists. No qty
stepper. Variation is locked by `(filling type, size's full/mini)` and qty by
the chosen Set Size.

**Customize on Ricotta** (default when Customize is first toggled):

```
Filling type:   [Ricotta]  [Ice Cream]
Shell:          [Chocolate*]  [Plain]
Filling:        [Original*]  [Chocolate]  [Tiramisu]  [Pistachio]  [Lemon Cello]  [Strawberry]
Garnish:        [Pistachio]  [Chocolate Chips]  [Toffee]  [Cherries]  [Mixed Garnish*]
Special Notes:  (text)
```
\* = pre-filled.

**Customize on Ice Cream** (after switching filling):

```
Filling type:   [Ricotta]  [Ice Cream]
Flavor:         [Vanilla]  [Chocolate]  [Coffee]  [Mint]  [Strawberry]    ← all empty
Special Notes:  (text)
```

The asymmetry follows the live catalog: the Ice Cream item has only a single
Flavor list (no shell, no garnish list).

### Switching filling type inside Customize

Wipes all modifier selections. The pre-fill recipe is Ricotta-specific and has
no Ice Cream analogue, so a fresh Ice Cream picker starts empty.

## Behavior

| Aspect | Default | Customize |
|---|---|---|
| Visible modifier lists | Special Notes only | Filling-specific lists + Special Notes |
| Modifier selections | Auto-applied at line creation | User-driven; pre-filled on Ricotta |
| Variation ID | Set option's Ricotta variation | Looked up by `(filling type, size variationPrefix)` |
| Qty | Fixed by Set Size | Fixed by Set Size |
| Line note prefix | `Set: <label>` | `Set: <label>` |
| Volume discount | Fires (Ricotta variation in product set) | Fires (same variation IDs) |
| Required-list validation | N/A (auto-applied) | Enforced — same rules as regular Cannoli |
| Mixed Garnish in Garnish list | n/a (auto-applied) | Selectable on Ricotta side |
| Multiple Boxes list | Hidden | Stripped on both sides |

## Data model

Extend the Cannoli Set composite item to carry both shapes:

```ts
type SnapshotItem = {
  // ...existing fields
  set?: SetInfo;                  // existing — drives Default mode
  cannoliFillings?: CannoliFilling[]; // NEW on Set composite — drives Customize
};
```

`cannoliFillings` is the same shape already used by the regular Cannoli and
Cannoli Kit composites — built from the underlying Ricotta and Ice Cream
items.

`SetOption` gains an optional `iceCream` variation reference per size, so
Customize → Ice Cream knows which Square variation to use:

```ts
type SetOption = {
  key: string;
  label: string;
  qty: number;
  // existing fields (Ricotta defaults)
  variationId: string;            // ricotta variation
  priceCents: number;             // ricotta variation price
  inStock: boolean;
  // NEW
  iceCream?: {
    variationId: string;
    priceCents: number;
    inStock: boolean;
  };
};
```

If the Ice Cream item is missing a matching variation, `iceCream` is omitted —
Customize → Ice Cream chips will reflect the size as out-of-stock for that
filling, mirroring how missing variations are handled elsewhere.

## Catalog build (`mergeCannoliItems`)

The Set composite already finds the Ricotta item and builds `set.options`. The
build path will additionally:

1. Build `cannoliFillings` (Ricotta + Ice Cream) using the existing helper that
   produces the regular Cannoli composite's filling array. Filter the modifier
   lists per the Set rules:
   - Strip `Cannoli Multiple Boxes` on both fillings
   - Strip the per-filling `Cannoli Special Notes` (top-level Set Special Notes
     covers it; avoids duplicate render)
   - Do **not** strip Mixed Garnish on the Ricotta Garnish list
2. Resolve `iceCream` for each `SetOption` by name-matching the Ice Cream item
   variations against the option's `variationPrefix`.

## Frontend (`OrderFlow.tsx`)

State per Set line gains a `mode: "default" | "customize"` flag (default
`"default"`).

- Mode chip picker rendered below the Size chip picker on items where
  `item.set && item.cannoliFillings` are both present.
- When `mode === "customize"`:
  - Render the filling chip picker, modifier lists, and Special Notes — reusing
    the existing regular-Cannoli render pipeline.
  - Hide the auto-modifier hint (currently shown on Default).
  - Effective `variationId` for the line is computed from the chosen filling +
    set option (Ricotta uses `option.variationId`, Ice Cream uses
    `option.iceCream.variationId`).
  - Effective `priceCents` for the line subtotal is the matching variation's
    price × `option.qty`.
- When toggling Customize on:
  - If filling is Ricotta, seed Filling=Original, Shell=Chocolate,
    Garnish=Mixed Garnish (look up modifier IDs by name from the Ricotta
    filling's modifier lists).
- When switching filling type inside Customize: wipe all per-filling modifier
  selections.
- When toggling back to Default: discard Customize selections, revert to the
  auto-applied recipe.

### Line validity

For a Set line:
- `default`: existing rule — variationId set, matches an option, autoModifiers
  not sold-out.
- `customize`: variationId set, matches the (filling, option) pair, all
  required modifier lists have a selection.

### Line submission

- `default`: existing path — line.modifiers is seeded from `set.autoModifiers`
  at addLine time and flushed at submission.
- `customize`: normal modifier flush from user selections — same path as a
  regular Cannoli line.

In both cases the line note is prefixed `Set: <label>` so the kitchen sees the
packaging signal regardless of recipe.

## Pricing & discounts

No engine changes. Customize lines submit with the same Ricotta or Ice Cream
variation IDs that the cannoli pricing rule's product set already covers, so
volume tiers fire and stack the same way Default sets do.

## Tests

- Set composite emits `cannoliFillings` with Multiple Boxes stripped on both
  fillings and per-filling Special Notes stripped.
- Set composite's `cannoliFillings` Ricotta Garnish list **includes** Mixed
  Garnish (regular composite still strips it).
- `SetOption.iceCream` is populated when Ice Cream variation is found, omitted
  when missing.
- Switching to Customize seeds Ricotta defaults (Filling/Shell/Garnish IDs).
- Switching filling type wipes selections.
- Line note prefix `Set: <label>` applies on both modes.
- Effective price for an Ice Cream Customize line uses the Ice Cream variation
  price × qty.
- Line validity: Customize Ricotta with missing required list is invalid.

## Out of scope

- Customization fee
- Per-cannoli mix-and-match within a single set (still one recipe per line)
- Allowing qty to differ from the Set Size
- Changing the regular Cannoli or Kit composites
- Adding Mixed Garnish or other modifiers to Ice Cream's catalog
