# Square Integration — Design Spec

**Date:** 2026-05-03
**Status:** Approved
**Scope:** Wire the existing "Start an Order" modal on romolocannoli.com to live Square data and real Square payments. Cannoli items, delivery, and custom comms are out of scope for this milestone.

---

## 1. Goal

Replace the mock 4-step order flow with a working end-to-end ordering experience backed by Square:

- Live catalog items, variations, modifiers, and stock status from Square.
- Real card payment via Square Web Payments SDK.
- A real Square Order created in the merchant's dashboard so Joey can fulfill it via Square POS.

The home-page menu, hero, heritage, and other marketing sections stay untouched. Only the "Start an Order" modal becomes functional.

## 2. Locked Constraints

| # | Decision |
|---|---|
| 1 | Wire only the **"Start an Order"** modal. Home menu thumbnails stay static. |
| 2 | Cannoli-specific UI (flavor mix, kit shells, "you decide") in the modal's **What** step is left as-is and stubbed off until the user wires Cannoli last. Non-cannoli items render a generic Variation picker + Modifier sets driven by Square data. |
| 3 | **Square Web Payments SDK** in-page on Step 4. Server-side `Orders.createOrder` + `Payments.createPayment` via Next.js API routes. |
| 4 | Catalog, inventory, and business hours fetched server-side, cached **15 min** (`revalidate: 900`). Stale-stock at order time caught by Square's order rejection and surfaced in UI. |
| 5 | **Pickup-only.** Delivery card hidden. `DeliveryConfig` rendering paths removed (file kept; component unreachable). |
| 6 | Open hours derived from Square `Locations.retrieveLocation` (`business_hours.periods`). 30-min slots. Closed days disabled. |
| 7 | Square handles all customer comms (receipt email + Joey's POS notification). Site stops at "order placed." |
| 8 | **Sandbox** Square account only for now. Test catalog seeded to mirror in-scope CSV items. Railway env vars only (no `.env.local`). |

## 3. Out of Scope

- Cannoli items (`Cannoli`, `Cannoli Online`, `Cannoli Kit (Per 6)`, the "Today's Flavors" rotation pad) — handled by user later.
- Delivery (zones, address forms, Sunday surcharge, long-haul phone-call handoff).
- Custom email/SMS comms beyond what Square sends natively.
- Customer accounts, login, order history.
- Square Bookings / lead-time scheduling.
- Sales tax computation (Square computes and applies tax automatically when items are tagged with a tax in the dashboard; we pass through whatever Square returns).
- Tipping (deferred — can be added in a follow-up).

## 4. Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         Next.js App on Railway                      │
│                                                                     │
│  ┌──────────────────┐         ┌───────────────────────────────┐   │
│  │ Server Components│         │ API Routes (server-only)       │   │
│  │                  │         │                                │   │
│  │ /  (page.tsx)    │ fetch   │ POST /api/orders               │   │
│  │   └─ <OrderFlow  │◄────────│   - validates payload          │   │
│  │      catalog={…} │         │   - Orders.createOrder         │   │
│  │      hours={…}/> │         │   - Payments.createPayment     │   │
│  │                  │         │   - returns { orderId, ok }    │   │
│  │ revalidate:900   │         │                                │   │
│  └──────────┬───────┘         │ GET  /api/health (sanity)      │   │
│             │                 └────────────┬───────────────────┘   │
│             │                              │                       │
│  ┌──────────▼─────────────────┐            │                       │
│  │ src/lib/square/            │            │                       │
│  │   client.ts (SDK init)     │            │                       │
│  │   catalog.ts (fetch+shape) │◄───────────┘                       │
│  │   hours.ts   (open periods)│                                    │
│  │   orders.ts  (build order) │                                    │
│  │   types.ts   (domain types)│                                    │
│  └────────────┬───────────────┘                                    │
│               │                                                     │
└───────────────┼─────────────────────────────────────────────────────┘
                │ HTTPS
                ▼
       ┌────────────────────┐
       │ Square Sandbox API │
       │  - Catalog         │
       │  - Inventory       │
       │  - Locations       │
       │  - Orders          │
       │  - Payments        │
       └────────────────────┘
```

### 4.1 Page-load data flow

1. `app/page.tsx` (Server Component) calls `getMenuSnapshot()` which fetches in parallel:
   - `CatalogApi.searchCatalogItems` — items + variations + modifier lists referenced by the items.
   - `InventoryApi.batchRetrieveInventoryCounts` — current stock for stockable variations.
   - `LocationsApi.retrieveLocation` — business hours for the configured location.
2. The shaper produces a `MenuSnapshot` (see §6) and passes it to a client island `<OrderProvider initialSnapshot={…}>`.
3. Page sets `export const revalidate = 900;` so Next.js regenerates the snapshot every 15 min.

### 4.2 Order-submit data flow

1. User completes Steps 1–3 of the modal (When → What → How).
2. Step 4 mounts the Square Web Payments SDK `Card` element (loaded from `https://sandbox.web.squarecdn.com/v1/square.js` in sandbox; production CDN URL flipped via env later).
3. User submits → `card.tokenize()` returns a `sourceId`.
4. Client POSTs `/api/orders` with:
   ```ts
   {
     idempotencyKey: string,            // uuid generated client-side, persisted per attempt
     sourceId: string,                  // Square card token
     pickupAt: string,                  // ISO 8601 timestamp
     contact: { name, phone, email },
     lines: Array<{
       catalogObjectId: string,         // variation id from snapshot
       quantity: number,
       modifiers: string[]              // modifier catalog_object_ids
     }>
   }
   ```
5. API route validates, calls `OrdersApi.createOrder` then `PaymentsApi.createPayment` linked to the order. On success returns `{ orderId, confirmation, status: "ok" }`. On failure returns a typed error (see §7).
6. Client renders Step 5 "Done" with the real Square order ID as confirmation.

## 5. Component & File Plan

### 5.1 New files

| Path | Purpose |
|---|---|
| `src/lib/square/client.ts` | Lazy singleton Square SDK client. Reads `SQUARE_ACCESS_TOKEN` and `SQUARE_ENVIRONMENT` from env. Throws clearly if unset. Server-only (`import "server-only"`). |
| `src/lib/square/catalog.ts` | `getMenuSnapshot()` — fetches catalog + inventory, returns shaped `MenuSnapshot`. Filters out items whose category contains "Cannoli". |
| `src/lib/square/hours.ts` | `getOpenPeriods()` — fetches Location, returns weekly hours. `slotsForDate(date, periods)` — generates 30-min ISO slots. |
| `src/lib/square/orders.ts` | `createOrderAndPayment(input)` — builds the Order payload, calls `Orders.createOrder` + `Payments.createPayment`, normalizes errors. |
| `src/lib/square/types.ts` | Domain types: `MenuSnapshot`, `SnapshotItem`, `SnapshotVariation`, `SnapshotModifierList`, `SnapshotModifier`, `OpenPeriods`. |
| `src/lib/square/serializers.ts` | Pure functions mapping Square SDK shapes → snapshot types. Unit-testable without network. |
| `src/app/api/orders/route.ts` | `POST` handler. Zod-validates payload, calls `createOrderAndPayment`, returns JSON. |
| `src/app/api/health/route.ts` | Optional `GET` returning `{ ok: true, env: "sandbox", catalogItems: N }` for deploy sanity. |
| `src/components/order/VariationPicker.tsx` | Renders a Square item's variations as a single-select (radio chips). Disabled if out of stock. |
| `src/components/order/ModifierSet.tsx` | Renders a Square modifier list per its selection_type (`SINGLE`/`MULTIPLE`) with min/max constraints. |
| `src/components/order/SquareCard.tsx` | Loads Web Payments SDK, mounts the `Card` element, exposes `tokenize()`. |

### 5.2 Modified files

| Path | Change |
|---|---|
| `src/app/page.tsx` | Becomes a Server Component that calls `getMenuSnapshot()` and passes the result to `<OrderProvider initialSnapshot={…}>`. |
| `src/app/layout.tsx` | Adds the Square Web Payments SDK `<script>` tag (deferred) so the SDK is preloaded for Step 4. |
| `src/components/OrderProvider.tsx` | Accepts `initialSnapshot` prop; extends `useOrder()` return to include `snapshot`. Keeps existing flavor toggle state for Cannoli scaffolding (unused in active flow). |
| `src/components/OrderFlow.tsx` | <ul><li>Step 1 (When): drive day enabled/disabled and time-slot list from `snapshot.hours` instead of hardcoded constants.</li><li>Step 2 (What): rebuild item dropdown from `snapshot.items` (which never contains cannoli — see §5.1 catalog filter). Render `<VariationPicker>` + `<ModifierSet>` for the selected item. The existing cannoli flavor-mix / shell UI stays in the file as dead-code scaffold (commented `// TODO: re-enable when Cannoli is wired`) so the user can rehydrate it later without rebuilding.</li><li>Step 3 (How): collapse to a single pickup confirmation card; remove the two-card grid and all delivery rendering.</li><li>Step 4 (Pay): replace mock card form with `<SquareCard>` and contact fields. Wire submit → `/api/orders`.</li><li>Step 5 (Done): show the real Square `orderId` as confirmation.</li></ul> |
| `src/components/Menu.tsx` | Unchanged for now (still uses `MENU_DATA` thumbnails). The "Start an Order" CTA still calls `open()`. |
| `src/lib/data.ts` | No runtime change. Comment added marking `MENU_DATA` and `INITIAL_FLAVORS` as Cannoli-only scaffolding to be removed when Cannoli is wired. |
| `package.json` | Add deps: `square` (Square Node SDK), `zod` (request validation). |

### 5.3 Deleted/removed paths

Nothing deleted from disk. The following code paths in `OrderFlow.tsx` become unreachable but are kept in the file commented as "// TODO: re-enable when delivery is in scope":

- `DeliveryConfig`, `FulfillmentCard` for the Delivery card, `DELIVERY_ZONES` import.
- The Sunday surcharge banner.

This keeps the file's structure familiar and makes re-enabling delivery a `git revert`-style operation.

## 6. Domain Types

```ts
// src/lib/square/types.ts

export type MenuSnapshot = {
  fetchedAt: string;             // ISO timestamp
  locationId: string;
  currency: "USD";
  items: SnapshotItem[];
  hours: OpenPeriods;
};

export type SnapshotItem = {
  id: string;                    // Square item id
  name: string;
  description?: string;
  categoryName?: string;
  isCannoli: boolean;            // categoryName contains "Cannoli"
  variations: SnapshotVariation[];
  modifierLists: SnapshotModifierList[];
};

export type SnapshotVariation = {
  id: string;                    // catalog_object_id used in Order line items
  name: string;                  // e.g. "Small", "Pint"
  priceCents: number;            // Square money in cents
  inStock: boolean;              // false if stockable AND count <= 0; true if not stockable
  pickupEnabled: boolean;        // mirrors CSV "Pickup Enabled"
};

export type SnapshotModifierList = {
  id: string;
  name: string;                  // "Cookie Flavors"
  selectionType: "SINGLE" | "MULTIPLE";
  minSelected: number;
  maxSelected: number | null;    // null = unlimited
  modifiers: SnapshotModifier[];
};

export type SnapshotModifier = {
  id: string;                    // catalog_object_id
  name: string;                  // "Chocolate Chip"
  priceCents: number;            // 0 if no upcharge
};

export type OpenPeriods = {
  // 0 = Sunday … 6 = Saturday
  byWeekday: Record<number, Array<{ openLocal: string; closeLocal: string }>>;
  timezone: string;              // e.g. "America/Los_Angeles"
};
```

## 7. Error Handling

A single discriminated union returned from `/api/orders`:

```ts
type OrderResult =
  | { status: "ok"; orderId: string; confirmation: string }
  | { status: "out_of_stock"; itemNames: string[] }
  | { status: "card_declined"; message: string }
  | { status: "invalid_payload"; field: string; message: string }
  | { status: "square_error"; code: string; message: string };
```

Mapping:
- Square inventory rejection → `out_of_stock`. Step 4 shows a banner: "X just sold out — please remove and try again." Modal returns user to Step 2 with the offending lines flagged.
- `CARD_DECLINED`, `CVV_FAILURE`, `EXPIRY_INVALID`, etc. → `card_declined`. Banner under the card field; user re-tokenizes.
- Zod failure → `invalid_payload`. Banner with the field. (Should never hit if client UI is correct.)
- Anything else → `square_error`. Generic "Something went wrong, please call us at (650) 574-0625." Console logs the full Square error for debugging.

Idempotency: client generates a UUID per submit attempt and sends as `idempotencyKey`. If user double-clicks, the second call returns the same Order/Payment. Key rotates if user goes back to Step 4 and edits anything.

## 8. Environment Variables

All set as Railway env vars (production environment of the Railway service; no separate `.env.local`):

| Variable | Scope | Purpose |
|---|---|---|
| `SQUARE_ENVIRONMENT` | server | `"sandbox"` for now. Flipped to `"production"` later. |
| `SQUARE_ACCESS_TOKEN` | server | Sandbox access token from developer dashboard. |
| `SQUARE_LOCATION_ID` | server | Sandbox test location ID. |
| `NEXT_PUBLIC_SQUARE_APPLICATION_ID` | client | Sandbox application ID for Web Payments SDK init. |
| `NEXT_PUBLIC_SQUARE_LOCATION_ID` | client | Same value as `SQUARE_LOCATION_ID`. Web Payments SDK requires it on the client. |
| `NEXT_PUBLIC_SQUARE_ENVIRONMENT` | client | `"sandbox"` so the client loads the sandbox SDK URL. |

Server reads via `process.env.*`. Client reads via `process.env.NEXT_PUBLIC_*` at build time.

## 9. Testing Strategy

This is a small surface, so testing is pragmatic rather than exhaustive:

1. **Unit tests** for `serializers.ts` (Square shape → snapshot shape) using fixtures. No network. Catches malformed catalog assumptions.
2. **Integration check** via `GET /api/health` — hits Square, returns counts. Used as a Railway healthcheck and a manual sanity check.
3. **Manual end-to-end** in Sandbox:
   - Place a test order for Cookies (has modifier set) → verify it shows in Square Sandbox dashboard with correct line item, modifier, customer email.
   - Place a test order for Ice Cream (multi-variation) → verify the right variation lands.
   - Use Square sandbox test card `4111 1111 1111 1111` + any future expiry, CVV `111`, ZIP any.
   - Use sandbox **decline** card to verify `card_declined` UI.
   - Mark a sandbox item as out-of-stock, attempt to order it → verify `out_of_stock` UI.
4. **Visual verification** on Railway preview: open the modal, walk through all 4 steps, place an order, confirm "Done" screen shows real Square order ID.

No automated E2E framework added in this milestone (would be overkill for a single 4-step modal).

## 10. Implementation Sequence (high-level)

1. Add `square` + `zod` deps. Create `lib/square/{client,types,serializers,catalog,hours}.ts` with unit tests for serializers.
2. Wire `app/page.tsx` as Server Component that calls `getMenuSnapshot()` and passes it through `OrderProvider`. Verify snapshot reaches the client via a temp `console.log`.
3. Refactor Step 1 (When) to use `snapshot.hours`. Verify closed days and slot list match Square Sandbox location.
4. Build `<VariationPicker>` and `<ModifierSet>` components. Refactor Step 2 (What) to branch cannoli vs non-cannoli, rendering the new components for non-cannoli.
5. Refactor Step 3 (How) to pickup-only confirmation card.
6. Build `<SquareCard>` (Web Payments SDK loader + tokenizer). Replace mock card form in Step 4.
7. Build `lib/square/orders.ts` and `app/api/orders/route.ts`. Wire submit. Show real confirmation in Step 5.
8. Add `/api/health`. Wire Railway healthcheck.
9. Manual end-to-end runs against Square Sandbox using test cards.
10. Document Railway env-var setup in `README.md`.

The detailed file-by-file ordering, dependencies, and test checkpoints will be produced by the next phase (writing-plans).

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Square SDK shape changes between sandbox and production | Sandbox and Production share the same SDK + API. The only env-driven difference is the access token, location ID, and Web Payments CDN host. Code paths are identical. |
| User opens modal at minute 14:59 of revalidate window — sees stale stock | Server-side order creation calls Square live; out-of-stock returns a clean UI error. 15-min staleness is bounded and acceptable. |
| Web Payments SDK fails to load (network/CSP) | Step 4 shows a fallback message: "Card field couldn't load — please refresh, or call (650) 574-0625 to order by phone." Submit button disabled. |
| Idempotency key reuse causes Square to reject a legitimate retry | Client regenerates the key whenever the user navigates *back* from Step 4 and changes anything. Same key only reused for true double-clicks of the same submit attempt. |
| Cannoli scaffolding (`MENU_DATA`, `INITIAL_FLAVORS`) drifts from reality | Comment in `data.ts` flags it as Cannoli-only scaffolding. The non-cannoli path doesn't depend on it at all, so drift can't break ordering. |

## 12. Acceptance Criteria

The milestone is done when, in Square Sandbox:

- [ ] Opening the modal shows live items from Square (Cookies, Ice Cream sizes, Tiramisu sizes, Chocolate Banana, Milkshake, Spumoni Wedge, Tartufi).
- [ ] Step 1 day buttons reflect Square Sandbox location's `business_hours.periods` — closed days disabled, time slots only within open periods.
- [ ] Step 2 for Cookies shows the "Cookie Flavors" modifier list with correct selection rules.
- [ ] Step 2 for Ice Cream shows 5 variation options with correct prices.
- [ ] Step 3 shows pickup confirmation only — no delivery card visible.
- [ ] Step 4 mounts Square's card field, accepts test card `4111 1111 1111 1111`, and on submit creates a real Sandbox Order + Payment visible in the Square dashboard.
- [ ] Step 5 shows the actual Square order ID.
- [ ] An out-of-stock variation in Sandbox cannot be ordered — UI shows the inline error.
- [ ] Sandbox decline card produces an inline `card_declined` error without leaving Step 4.
- [ ] Cannoli items: any Cannoli SKU returned by Square is filtered out of the modal entirely. Existing cannoli scaffold UI is unreachable from Square data.
