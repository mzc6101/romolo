# Square Integration — Design Spec

**Date:** 2026-05-03
**Status:** Approved design, pending implementation plan
**Context:** The Romolo's Cannoli site is currently a frontend-only Next.js app. The order flow modal collects order details and fake card data but submits nothing. This spec covers wiring the site to Square for online ordering, payments, and stock awareness — preparing as much as possible without Square credentials so that connecting the live account is a small, well-scoped step.

---

## 1. Locked decisions

These three decisions shape everything below. Each was chosen with a deliberate trade-off.

### 1.1 Hybrid menu ownership

The website owns **which items appear** and their **visual presentation** (names, descriptions, photos, ordering, the bespoke shell/flavor-mix UX). Square owns **price**, **modifiers**, and **stock status**.

Why: Square's standard catalog model can't cleanly express the per-dozen flavor-mixing or "you decide" UX, but the shop will manage prices and stock from Square's dashboard like any other POS workflow. Pulling Square's full catalog and mapping it back to our presentation layer would be brittle and add no value.

### 1.2 Explicit ID mapping per item

Each `MenuItem` and `Flavor` gets optional `squareItemId` / `squareVariationId` fields. The mapping table is filled in by hand once we have Square access. While unset, the website falls back to its hardcoded price.

Why: Explicit, debuggable, survives Square dashboard reorganizations. Coupling our IDs to a SKU field would break silently on typos and leave no obvious place to look when something goes wrong.

### 1.3 Full Square Orders API + Payments API integration

Orders are built as Square `Order` objects with line items, fulfillment, customer notes, and service charges, then charged via the Payments API tied to that order. Not a Checkout / Payment Link.

Why: The shop staff almost certainly wants online orders landing in their Square dashboard / kitchen printer the same way an in-person order does. The order flow already collects rich line-item data; throwing it away to submit a single dollar amount would lose the operational value.

---

## 2. Architecture

### 2.1 File layout

```
src/
  lib/
    data.ts                      ← extended with squareItemId / squareVariationId / trackStock fields
    menu.ts                      ← NEW: loadMenu() — merges static data with Square (price/stock)
    square/
      env.ts                     ← reads + validates SQUARE_* env vars; exports isSquareConfigured
      client.ts                  ← singleton Square Node SDK client (sandbox vs production)
      catalog.ts                 ← fetch prices, modifiers, stock by ID; in-memory cache w/ TTL
      stockCache.ts              ← webhook-fed Map<variationId, count>; swappable interface
      orders.ts                  ← build Square Order payload from our domain Order type
      payments.ts                ← create payment from Web Payments SDK token + order
      webhooks.ts                ← signature verification, event router
      mappers.ts                 ← STUB: domain types ⇄ Square types (real logic blocked on catalog access)
      types.ts                   ← internal types for what we read back from Square
      __fixtures__/              ← sample Square API responses for unit tests

  app/
    api/
      menu/
        route.ts                 ← GET: returns merged menu; degrades to MENU_DATA when unconfigured
      orders/
        route.ts                 ← POST: create draft Square Order, return orderId + totals
        pay/
          route.ts               ← POST: charge via Payments API, return confirmation
      webhooks/
        square/
          route.ts               ← receives inventory.count.updated, payment.updated, order.updated

  components/
    OrderFlow.tsx                ← StepPay swaps fake card UI for <SquareCard>
    SquareCard.tsx               ← NEW: Web Payments SDK card form + tokenize
    Menu.tsx                     ← reads from loadMenu() instead of MENU_DATA directly

docs/
  square-setup.md                ← runbook for connecting credentials when they arrive

.env.example                     ← committed: documents every Square env var
```

### 2.2 Packages

- `square` — Node SDK, server-only, used by all `src/lib/square/*.ts` files except client-facing types.
- `@square/web-sdk` — browser-only, dynamically loaded inside `SquareCard.tsx` so it doesn't bloat the SSR bundle.
- `zod` — request body validation on every API route.
- `vitest` — unit + sandbox contract test runner.

### 2.3 Server-only enforcement

Every `src/lib/square/*.ts` file (except `types.ts`) starts with `import "server-only"`. Accidental import from a client component fails at build time, not at runtime in production.

---

## 3. Environment variables

### 3.1 Variable list

```bash
# Square — sandbox first, swap to production when ready
SQUARE_ENV=sandbox                  # "sandbox" | "production"
SQUARE_ACCESS_TOKEN=                # server-side only, NEVER ship to client
SQUARE_LOCATION_ID=                 # which location orders post to
SQUARE_WEBHOOK_SIGNATURE_KEY=       # for verifying inbound webhooks

# Public (browser-safe — these go to Web Payments SDK)
NEXT_PUBLIC_SQUARE_APP_ID=
NEXT_PUBLIC_SQUARE_LOCATION_ID=     # mirrors SQUARE_LOCATION_ID, exposed for browser
NEXT_PUBLIC_SQUARE_ENV=sandbox
```

### 3.2 Validation behaviour

`src/lib/square/env.ts` validates these once at module load. If any required var is missing or empty, exports `isSquareConfigured = false` and lets callers decide how to degrade. **No crashes at boot for missing creds** — the site must always boot in degraded mode.

### 3.3 Railway state (already configured)

| Var | Value | Note |
|---|---|---|
| `SQUARE_ENV` | `sandbox` | Safe default — flip to `production` consciously when ready to take real money |
| `NEXT_PUBLIC_SQUARE_ENV` | `sandbox` | Mirrors `SQUARE_ENV` |
| `NEXT_PUBLIC_SQUARE_LOCATION_ID` | `${{SQUARE_LOCATION_ID}}` | Railway variable reference — auto-syncs once `SQUARE_LOCATION_ID` is set |

The remaining vars (`SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_WEBHOOK_SIGNATURE_KEY`, `NEXT_PUBLIC_SQUARE_APP_ID`) are **not present on Railway** — Railway treats `--set "KEY="` as a no-op. They will be added via the Railway dashboard when credentials arrive. The runbook (§9) covers this.

### 3.4 Future: separate staging environment

Only one Railway environment exists today (`production`). Once real creds arrive, a `staging` Railway environment is recommended so sandbox testing never touches the live deploy. Out of scope for this spec.

---

## 4. Data layer

### 4.1 `MenuItem` extension

```ts
export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;                    // fallback when squareVariationId unset
  imageUrl?: string;

  // Square mapping — fill in when creds arrive
  squareItemId?: string;            // CatalogObject ID for the parent ITEM
  squareVariationId?: string;       // ITEM_VARIATION ID — what actually has price + stock
  trackStock?: boolean;             // hint to the menu UI; defaults false
};
```

Both IDs are kept available because price and stock live on the *variation* in Square, not the parent item. Items with multiple shells (e.g. `Cannoli — Full Size`) likely map to multiple variations.

### 4.2 `Flavor` extension

```ts
export type Flavor = {
  id: string;
  name: string;
  available: boolean;               // becomes derived from Square stock at runtime
  today: boolean;
  color: string;
  squareVariationId?: string;       // for stock tracking; not necessarily a billable line
};
```

`available` stays in the type for the unconfigured/fallback path. When `squareVariationId` is set, the runtime menu loader overwrites it from the webhook-fed stock cache.

### 4.3 Modifier strategy

The order flow has two custom concepts that don't map to a single Square primitive:

| Concept | Square representation | Why |
|---|---|---|
| **Shell choice** (plain / chocolate-dipped +$0.50 / pistachio-dusted +$0.50) | Square *variations* — each shell is its own variation with its own price | Cleanest representation; staff can change uplift in Square without a code deploy |
| **Flavor mix** ("6 original, 2 strawberry, 2 chocolate" or "you decide") | Structured **note** on the Square line item | Square's modifier model can't express "of these 12 cannoli, distribute across N flavors" |

Final shape going into `Order.line_items[].note`:
- Standard mix: `Filling: 6× Original Ricotta, 4× Pistachio, 2× Chocolate Chip`
- "You decide": `Filling: chef's choice (12)`
- Shell shows as the variation name itself (`Cannoli — Full Size · Pistachio-dusted`); no note needed

### 4.4 Catalog mapping is deferred

The actual mapping (which Square variation ID goes with which `MenuItem`, whether shells become variations or modifiers, how the kit and milkshake special-case) cannot be designed without seeing the live Square catalog, which has unusual structure. The mapping logic is concentrated in **two stub files**:

- `mappers.ts` → `squareLineItemsForOrderLine(line: OrderLine): SquareOrderLineItem[]`
- `mappers.ts` → `applyStockEvent(event: SquareInventoryEvent): StockUpdate[]`

Both throw `"Not configured — needs Square catalog mapping"` until catalog access is available. Everything upstream (order flow UI, API routes, payment flow) and downstream (Square API call) is built and testable against the Square sandbox without these.

### 4.5 New runtime menu shape

Components no longer read `MENU_DATA` directly for prices/stock. Instead:

```ts
// src/lib/menu.ts
export async function loadMenu(): Promise<MenuCategory[]>
```

Loader merges `MENU_DATA` (names, descriptions, photos, ordering) with Square data (prices, stock). When Square isn't configured, returns `MENU_DATA` unchanged so the site keeps working through the connect-up process. The `squareSyncedAt` field becomes real — populated from the loader's last-fetched timestamp, formatted relative.

---

## 5. Backend

### 5.1 SDK wrapper

`src/lib/square/client.ts` — singleton, lazy-initialized, picks sandbox vs production from env. Exposes typed sub-clients (`catalogApi`, `ordersApi`, `paymentsApi`, `inventoryApi`, `webhooksApi`). Never imported by client components.

`src/lib/square/catalog.ts` — read prices + modifiers + stock by ID, batched via `BatchRetrieveCatalogObjects`, in-memory cache with 60s TTL (configurable):
```ts
getVariationPrice(variationId: string): Promise<number | null>
getStockCount(variationId: string): Promise<number | null>
```

`src/lib/square/stockCache.ts` — the webhook-fed in-process `Map<variationId, count>`. Tiny interface (`get`, `set`, `bulkSet`) so we can swap in Redis / Vercel KV / Upstash later without touching call sites. Single-instance Docker on Railway is fine for v1.

### 5.2 API routes

#### `GET /api/menu`

- Calls `loadMenu()` → returns merged `MenuCategory[]` (our data + Square prices/stock).
- 60-second `Cache-Control: s-maxage=60, stale-while-revalidate=300`.
- Used by the home page (server component) and the order flow modal.

#### `POST /api/orders`

- Body: our domain `Order` (lines, fulfillment, contact, address, etc.).
- Calls `mappers.squareLineItemsForOrderLine()` per line → builds Square `CreateOrderRequest` with:
  - line items (with the kitchen-readable filling note from §4.3)
  - fulfillment object (`PICKUP` or `SHIPMENT` w/ delivery details)
  - service charges for delivery fee + Sunday surcharge
  - idempotency key (UUID, stored client-side and re-sent on retry)
- Returns `{ orderId, totals: { subtotal, fees, total } }`.
- Doesn't charge yet — order is in `OPEN` state, payment confirms it.

#### `POST /api/orders/pay`

- Body: `{ orderId, sourceId, idempotencyKey, contact }`.
- `sourceId` is the token from Web Payments SDK `card.tokenize()`.
- Creates Square `Payment` with `order_id` linkage so line items show up on the receipt.
- Returns `{ confirmation, status, receiptUrl }`.

#### `POST /api/webhooks/square`

- Verifies `x-square-hmacsha256-signature` header against `SQUARE_WEBHOOK_SIGNATURE_KEY`.
- Routes by event type:
  - `inventory.count.updated` → updates `stockCache`
  - `payment.updated` → reserved for later (email receipt, SMS notification — out of scope for v1)
  - `order.updated` → reserved for later (refund handling)
- Always returns 200 quickly (Square retries 4xx/5xx); does processing async.
- Idempotent: same event ID can be delivered multiple times safely.

### 5.3 Validation, errors, idempotency

- **Zod** for validating request bodies on every API route. One schema per route, colocated.
- **Idempotency keys** generated client-side per order attempt (UUID v4), stored in component state so retries don't double-charge.
- **Error responses** are typed: `{ error: { code, message, details? } }` where `code ∈ { SQUARE_UNAVAILABLE, PRICE_CHANGED, CARD_DECLINED, ITEM_OUT_OF_STOCK, VALIDATION, SQUARE_NOT_CONFIGURED } }` — frontend has a single error renderer.
- **Server-only enforcement**: `import "server-only"` at the top of every `src/lib/square/*.ts` file.
- **No PII logging**: card data never reaches our server (handled by Square Web Payments SDK and tokenized in browser); logger redacts emails / phones.

### 5.4 Webhooks for stock

1. Square sends `inventory.count.updated` to `/api/webhooks/square` whenever a count changes for a tracked variation.
2. Handler verifies HMAC, parses event, updates `stockCache` keyed by `squareVariationId`.
3. `loadMenu()` reads from `stockCache` when building its response — no Square API round-trip needed in the hot path.
4. Cold-start fallback: `loadMenu()` lazy-fetches via `BatchRetrieveInventoryCounts` on first request, then live on webhooks afterwards.

**Square config note for the runbook:** stock tracking has to be enabled per-variation in the Square dashboard, otherwise the webhook never fires for that item.

---

## 6. Frontend

### 6.1 `SquareCard` component

New file: `src/components/SquareCard.tsx` — client component, dynamically loads `@square/web-sdk`.

```tsx
<SquareCard
  applicationId={NEXT_PUBLIC_SQUARE_APP_ID}
  locationId={NEXT_PUBLIC_SQUARE_LOCATION_ID}
  onTokenize={(token) => /* ... */}
  onError={(err) => /* ... */}
  disabled={!squareReady}
/>
```

Internals:
1. On mount: `window.Square.payments(appId, locationId)` → `payments.card()` → `card.attach('#square-card-container')`.
2. Square renders its own iframe — handles PCI compliance, masks card data, never touches our DOM with raw card numbers.
3. When parent's "Place order" button is clicked, calls `card.tokenize()` → returns one-time-use `sourceId`.
4. Token handed to `POST /api/orders/pay` along with `orderId` from §5.2.
5. Cleanup: `card.destroy()` on unmount to avoid leaked iframes.

**Degraded mode** (when `NEXT_PUBLIC_SQUARE_APP_ID` is missing): banner reads *"Online ordering coming soon — call (650) 574-0625 to place an order."* Order flow remains walkable end-to-end for design review; just can't submit.

### 6.2 `StepPay` rewrite

Card UI block (lines 916–959 of `OrderFlow.tsx`) deletes. Replaced with `<SquareCard>`. The "I agree to the order — preview only, no real charge" checkbox is renamed *"I agree to the order details above"* and stays as the order-confirmation gate.

Flow becomes:
1. User fills contact name/phone/email.
2. SquareCard initializes the iframe.
3. User enters card. Card field becomes valid → enables Continue.
4. Click "Place order" → `card.tokenize()` → `POST /api/orders` → `POST /api/orders/pay` → on success, advance to StepDone with the real Square confirmation number.

### 6.3 Error states in StepPay

Each error from the API renders inline in StepPay (no toast, no nav away from the modal):

| Error code | UI |
|---|---|
| `CARD_DECLINED` | Red banner: *"Card was declined. Try a different card."* Card field stays in place. |
| `ITEM_OUT_OF_STOCK` | Yellow banner: *"Pistachio just sold out — pick something else."* Bounces back to StepWhat with that flavor disabled. |
| `PRICE_CHANGED` | Yellow banner with old/new totals: *"Prices updated since you started — total is now $X.XX. Continue?"* One-click confirm. |
| `SQUARE_UNAVAILABLE` | Red banner: *"Payments are temporarily down. Call us at (650) 574-0625 — we'll take your order over the phone."* |
| `VALIDATION` | Inline next to the offending field. |

### 6.4 Menu page — stock UI

`Menu.tsx` becomes a server component, calls `loadMenu()`. Per item:
- `trackStock && stockCount === 0`: greyed-out tile with "Sold out today" ribbon, click disabled, removed from order-flow item dropdown.
- `trackStock && stockCount <= LOW_STOCK_THRESHOLD` (configurable, default 5): subtle "Only N left" badge.
- Otherwise: unchanged.

`squareSyncedAt: "2 min ago"` becomes real — derived from `loadMenu()`'s last-fetched timestamp.

### 6.5 OrderFlow — flavor stock awareness

`StepWhat`'s flavor chips already filter by `f.available`. That field stops being hardcoded in `INITIAL_FLAVORS` and starts being hydrated from the menu loader. The component's prop signature (`flavors: Flavor[]` at line 66) doesn't change — only the upstream source does. `OrderFlowMount.tsx` is updated to receive flavors as a prop from a server component parent rather than importing `INITIAL_FLAVORS` directly.

### 6.6 What stays exactly the same

- All step-to-step navigation, validation logic, layout, copy.
- Order summary calculation in the footer.
- Date/time picking, fulfillment selection, delivery zone logic, address inputs.
- The "Mix it up — you decide" UX.
- StepDone confirmation screen (just shows real Square confirmation number instead of `RC-` random).

---

## 7. Testing strategy

### 7.1 Three layers

1. **Unit tests (vitest)** — pure functions: mappers, env validator, price-fallback logic, flavor-mix-to-note formatter, stock cache, webhook signature verification (synthetic payload). No network, no Square SDK. Runs on every save.

2. **Contract tests against Square sandbox** — only run when `SQUARE_ENV=sandbox` and a `SANDBOX_*` set of env vars exists. One test per API route: create order, charge it, verify webhook signature, fetch catalog. Not run in CI by default; opt-in via `npm run test:sandbox`. Catches breakage from Square SDK upgrades.

3. **End-to-end smoke (Playwright)** — walks the order flow in a real browser using Square's test card numbers (`4111 1111 1111 1111` succeeds, `4000 0000 0000 0002` declines). Three tests: golden-path, decline, out-of-stock.

### 7.2 Fixtures

`src/lib/square/__fixtures__/` — sample Square API responses (catalog, order, payment, webhook events). Mappers tested against these without hitting the network.

---

## 8. Build sequence

### 8.1 Phase A — buildable now (no Square creds needed)

| # | Step | Verifiable how |
|---|---|---|
| 1 | Install `square`, `@square/web-sdk`, `zod`, `vitest`, `@vitejs/plugin-react` (dev) | `npm install` succeeds, dev server still boots |
| 2 | Create `.env.example` with all Square vars documented; ensure `.env.local` is gitignored | Files exist, no `.env.local` committed |
| 3 | `src/lib/square/env.ts` — env validation, exports `isSquareConfigured` | Unit test: missing vars → `isSquareConfigured = false`, no throw |
| 4 | `src/lib/square/client.ts` — lazy SDK client, sandbox/prod switch | Unit test: client only constructed when configured |
| 5 | `src/lib/square/stockCache.ts` — in-process Map cache | Unit tests on get/set/bulkSet |
| 6 | `src/lib/square/mappers.ts` — STUB that throws "needs catalog mapping" | Stub exists with clear TODO + tests asserting the throw |
| 7 | `src/lib/square/orders.ts`, `payments.ts`, `webhooks.ts`, `catalog.ts` | Wired to client + mappers; webhook HMAC verification fully implemented |
| 8 | `src/app/api/menu/route.ts` — degrades to `MENU_DATA` when unconfigured | `GET /api/menu` returns the current static menu in dev |
| 9 | `src/app/api/orders/route.ts` + `pay/route.ts` — return `503 SQUARE_NOT_CONFIGURED` when no creds | Test that endpoints respond correctly |
| 10 | `src/app/api/webhooks/square/route.ts` — fully written, just unused until subscription exists | Unit test signature verification with synthetic payload |
| 11 | Add `squareItemId` / `squareVariationId` / `trackStock` fields to `MenuItem` and `Flavor` (all `undefined` for now) | TypeScript compiles |
| 12 | `src/lib/menu.ts` — `loadMenu()` merges static data with Square (no-op when unconfigured) | Returns identical shape to current `MENU_DATA` |
| 13 | `Menu.tsx` reads from `loadMenu()` instead of `MENU_DATA` directly | Site looks identical to today |
| 14 | `OrderFlow.tsx` `StepPay` — Square card UI replaced with `<SquareCard>`, degraded-mode banner shows | Modal renders banner, "Place order" disabled, rest of flow walkable |
| 15 | `SquareCard.tsx` component, dynamic SDK loader, error rendering | Renders banner when unconfigured |
| 16 | `docs/square-setup.md` runbook | Written |
| 17 | Vitest setup + unit test suite | `npm test` green |

After step 17 the site looks and works identically to today, but every line of plumbing is in place. Deploying is safe — degraded mode is the active mode.

### 8.2 Phase B — waits for Square access (~2 hours of work)

- Fill in `squareItemId` / `squareVariationId` on each `MenuItem` and `Flavor`.
- Implement the two stub mappers (`squareLineItemsForOrderLine`, `applyStockEvent`) against the actual Square catalog shape.
- Paste creds into Railway dashboard.
- Create webhook subscription in Square dashboard.
- Run `npm run test:sandbox` to verify connection.
- Walk a live test order through the deployed site using a Square test card.
- Flip to production creds.

---

## 9. Sandbox runbook (`docs/square-setup.md`)

When credentials arrive, follow these steps in order:

1. Create a Square sandbox application at `developer.squareup.com`.
2. Copy `Application ID`, `Access Token`, `Location ID` → paste into Railway dashboard for the `production` environment (or `.env.local` for local dev).
3. Confirm `SQUARE_ENV=sandbox` and `NEXT_PUBLIC_SQUARE_ENV=sandbox` (already set on Railway).
4. **Catalog mapping pass:** for each item in `MENU_DATA`, find its Square variation ID and fill in `squareItemId` / `squareVariationId`. Implement the real logic in `src/lib/square/mappers.ts`.
5. **Webhook subscription:** URL = `https://romolo-production.up.railway.app/api/webhooks/square`, events = `inventory.count.updated`, `payment.updated`, `order.updated`. Copy the signature key into `SQUARE_WEBHOOK_SIGNATURE_KEY`.
6. Enable per-variation stock tracking in the Square dashboard for any item that should show "sold out" UI.
7. Run `npm run test:sandbox` to verify the connection.
8. Walk a test order through the live deployed site using a Square test card (`4111 1111 1111 1111`). Confirm it lands in the Square dashboard.
9. **Only after sandbox passes end-to-end:** create a production app at Square, swap the access token / location ID / app ID / webhook signature key for production values, flip `SQUARE_ENV=production` and `NEXT_PUBLIC_SQUARE_ENV=production`. Consider creating a separate `staging` Railway environment first so sandbox testing doesn't touch the live deploy.

---

## 10. Out of scope for v1

The following are explicitly deferred:

- **Email/SMS notifications** on payment success or fulfillment ready (would consume `payment.updated` and `order.updated` webhooks — handler routes are stubbed).
- **Refund handling** (would consume `order.updated`).
- **Saved customer profiles / repeat orders** (Square `Customers` API).
- **Tipping** (Square supports it on the Payments API; current order flow has no tipping UI).
- **Loyalty / discounts / gift cards** (Square supports all of these; not in current order flow).
- **Multi-location support** (single `SQUARE_LOCATION_ID`).
- **Persistent order history for the customer** (no auth, no database).
- **Redis / Vercel KV / Upstash** for the stock cache (single-instance Docker on Railway is fine for v1; cache interface is swappable).
- **Separate `staging` Railway environment** (recommended once real creds arrive, but out of scope for the build itself).
