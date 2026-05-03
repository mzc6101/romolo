# Square Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Romolo's Cannoli site to Square for online ordering, payments, and stock awareness — building all infrastructure now so connecting live credentials is a small, well-scoped follow-up step.

**Architecture:** Hybrid menu ownership (website owns presentation, Square owns price/modifiers/stock). Explicit per-item ID mapping via optional `squareItemId` / `squareVariationId` fields with hardcoded-price fallback. Full Square Orders API + Payments API integration so orders land in the Square dashboard like in-person orders. Catalog mapping logic concentrated in two stub files that complete only when Square access is available.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, `square` Node SDK, `@square/web-sdk` browser SDK, `zod` for request validation, `vitest` for unit/contract tests.

**Spec:** `docs/square-integration-design.md`

**Out of scope for this plan:** Playwright e2e tests and the `__sandbox__/` contract test suite are referenced in the spec (§7) but defer to the post-credentials phase — they require a live Square sandbox connection to be useful. The unit test coverage in this plan exercises every code path with mocked SDK responses.

**Important reference notes for the implementing engineer:**
- The Square Node SDK class is `Client` from the `square` package, with `Environment.Sandbox` / `Environment.Production`. Money amounts are `BigInt`.
- The Web Payments SDK loads from `https://sandbox.web.squarecdn.com/v1/square.js` (sandbox) or `https://web.squarecdn.com/v1/square.js` (production) and exposes `window.Square`.
- Webhook signatures are HMAC-SHA256 of `(notification_url + raw_request_body)`, base64-encoded, in the `x-square-hmacsha256-signature` header.
- Verify exact SDK API signatures against `developer.squareup.com` docs before writing implementation code in any task — Square SDK shapes change between major versions.

---

## File Structure

**New files:**
- `.env.example` — committed template for env vars
- `vitest.config.ts` — test runner config
- `src/lib/menu.ts` — `loadMenu()` server function
- `src/lib/square/env.ts` — env validation
- `src/lib/square/client.ts` — Square SDK singleton
- `src/lib/square/catalog.ts` — price + stock fetchers
- `src/lib/square/stockCache.ts` — in-process stock cache
- `src/lib/square/orders.ts` — Square Order builders
- `src/lib/square/payments.ts` — payment creation
- `src/lib/square/webhooks.ts` — signature verification + event router
- `src/lib/square/mappers.ts` — domain ⇄ Square type mappers (stub until catalog access)
- `src/lib/square/types.ts` — internal types
- `src/app/api/menu/route.ts` — GET merged menu
- `src/app/api/orders/route.ts` — POST create draft Square order
- `src/app/api/orders/pay/route.ts` — POST charge order
- `src/app/api/webhooks/square/route.ts` — POST receive Square webhooks
- `src/components/SquareCard.tsx` — Web Payments SDK card form
- `docs/square-setup.md` — runbook for connecting credentials

**Modified files:**
- `package.json` — add deps + scripts
- `.gitignore` — ensure `.env.local` is ignored
- `src/lib/data.ts` — add `squareItemId` / `squareVariationId` / `trackStock` fields to types
- `src/components/OrderProvider.tsx` — accept initial server data via props
- `src/components/OrderFlowMount.tsx` — pass through server data
- `src/components/Menu.tsx` — read from server-loaded menu, render stock UI
- `src/components/OrderFlow.tsx` — `StepPay` swaps to `<SquareCard>` + error rendering, order submission flow wires to `/api/orders` + `/api/orders/pay`
- `src/app/page.tsx` — server-side `loadMenu()` call, pass data into `OrderProvider`

---

## Task 1: Project setup — dependencies, vitest, env scaffolding

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install square @square/web-sdk zod
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install --save-dev vitest @vitest/coverage-v8 @types/node
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});
```

- [ ] **Step 4: Add scripts to `package.json`**

Inside `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:sandbox": "SQUARE_TEST_SANDBOX=1 vitest run src/lib/square/__sandbox__"
```

- [ ] **Step 5: Create `.env.example`**

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

- [ ] **Step 6: Verify `.env.local` is ignored**

Run: `grep -E "^\.env" .gitignore`
Expected output includes a line covering `.env.local` (typically `.env*` or `.env.local`).
If missing, add `.env.local` to `.gitignore`.

- [ ] **Step 7: Verify dev server still boots**

Run: `npm run dev`
Expected: Next.js dev server starts without errors. Visit `http://localhost:3000`. Site renders identically to before. Stop the server.

- [ ] **Step 8: Verify test runner works**

Run: `npm test`
Expected: vitest runs, finds 0 tests, exits 0.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vitest.config.ts .env.example .gitignore
git commit -m "Add Square SDK deps, vitest, and env scaffolding"
```

---

## Task 2: Env validation module

**Files:**
- Create: `src/lib/square/env.ts`
- Create: `src/lib/square/env.test.ts`

- [ ] **Step 1: Write failing test for unconfigured state**

`src/lib/square/env.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

function clearSquareEnv() {
  delete process.env.SQUARE_ENV;
  delete process.env.SQUARE_ACCESS_TOKEN;
  delete process.env.SQUARE_LOCATION_ID;
  delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  delete process.env.NEXT_PUBLIC_SQUARE_APP_ID;
  delete process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
  delete process.env.NEXT_PUBLIC_SQUARE_ENV;
}

describe("square env", () => {
  beforeEach(() => {
    vi.resetModules();
    clearSquareEnv();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("reports unconfigured when secrets missing", async () => {
    const env = await import("./env");
    expect(env.isSquareConfigured).toBe(false);
    expect(env.squareEnv()).toBeNull();
  });

  it("reports unconfigured when token is empty string", async () => {
    process.env.SQUARE_ENV = "sandbox";
    process.env.SQUARE_ACCESS_TOKEN = "";
    process.env.SQUARE_LOCATION_ID = "L123";
    const env = await import("./env");
    expect(env.isSquareConfigured).toBe(false);
  });

  it("reports configured when all required vars present", async () => {
    process.env.SQUARE_ENV = "sandbox";
    process.env.SQUARE_ACCESS_TOKEN = "EAAAxxx";
    process.env.SQUARE_LOCATION_ID = "L123";
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = "whk";
    const env = await import("./env");
    expect(env.isSquareConfigured).toBe(true);
    expect(env.squareEnv()).toEqual({
      mode: "sandbox",
      accessToken: "EAAAxxx",
      locationId: "L123",
      webhookSignatureKey: "whk",
    });
  });

  it("rejects invalid SQUARE_ENV value", async () => {
    process.env.SQUARE_ENV = "weird";
    process.env.SQUARE_ACCESS_TOKEN = "EAAAxxx";
    process.env.SQUARE_LOCATION_ID = "L123";
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = "whk";
    const env = await import("./env");
    expect(env.isSquareConfigured).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- env.test`
Expected: FAIL — module `./env` not found.

- [ ] **Step 3: Implement `env.ts`**

```ts
import "server-only";

export type SquareMode = "sandbox" | "production";

export type SquareEnv = {
  mode: SquareMode;
  accessToken: string;
  locationId: string;
  webhookSignatureKey: string;
};

function readEnv(): SquareEnv | null {
  const mode = process.env.SQUARE_ENV;
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  if (mode !== "sandbox" && mode !== "production") return null;
  if (!accessToken || !locationId || !webhookSignatureKey) return null;

  return { mode, accessToken, locationId, webhookSignatureKey };
}

let cached: SquareEnv | null | undefined;

export function squareEnv(): SquareEnv | null {
  if (cached === undefined) cached = readEnv();
  return cached;
}

export const isSquareConfigured: boolean = squareEnv() !== null;

export function publicSquareConfig() {
  return {
    appId: process.env.NEXT_PUBLIC_SQUARE_APP_ID ?? null,
    locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? null,
    mode: (process.env.NEXT_PUBLIC_SQUARE_ENV ?? null) as SquareMode | null,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- env.test`
Expected: PASS, 4 passing tests.

> Note: `import "server-only"` will throw at test runtime if vitest doesn't shim it. If a test fails with `Module "server-only" not found`, install: `npm install --save-dev server-only` (it's a tiny no-op package shipped by Next.js but vitest needs it resolvable).

- [ ] **Step 5: Commit**

```bash
git add src/lib/square/env.ts src/lib/square/env.test.ts package.json package-lock.json
git commit -m "Add Square env validation with isSquareConfigured guard"
```

---

## Task 3: Square SDK client singleton

**Files:**
- Create: `src/lib/square/client.ts`
- Create: `src/lib/square/client.test.ts`

- [ ] **Step 1: Write failing test**

`src/lib/square/client.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("square client", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.SQUARE_ENV;
    delete process.env.SQUARE_ACCESS_TOKEN;
    delete process.env.SQUARE_LOCATION_ID;
    delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns null when not configured", async () => {
    const { getSquareClient } = await import("./client");
    expect(getSquareClient()).toBeNull();
  });

  it("returns a singleton client when configured", async () => {
    process.env.SQUARE_ENV = "sandbox";
    process.env.SQUARE_ACCESS_TOKEN = "EAAAxxx";
    process.env.SQUARE_LOCATION_ID = "L123";
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = "whk";
    const { getSquareClient } = await import("./client");
    const a = getSquareClient();
    const b = getSquareClient();
    expect(a).not.toBeNull();
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- client.test`
Expected: FAIL — module `./client` not found.

- [ ] **Step 3: Implement `client.ts`**

```ts
import "server-only";
import { Client, Environment } from "square";
import { squareEnv } from "./env";

let cached: Client | null | undefined;

export function getSquareClient(): Client | null {
  if (cached !== undefined) return cached;
  const env = squareEnv();
  if (!env) {
    cached = null;
    return null;
  }
  cached = new Client({
    accessToken: env.accessToken,
    environment: env.mode === "production" ? Environment.Production : Environment.Sandbox,
    userAgentDetail: "romolo-web/1.0",
  });
  return cached;
}

export function getSquareLocationId(): string | null {
  return squareEnv()?.locationId ?? null;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- client.test`
Expected: PASS, 2 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/square/client.ts src/lib/square/client.test.ts
git commit -m "Add lazy Square SDK client singleton"
```

---

## Task 4: Stock cache

**Files:**
- Create: `src/lib/square/stockCache.ts`
- Create: `src/lib/square/stockCache.test.ts`

- [ ] **Step 1: Write failing test**

`src/lib/square/stockCache.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { stockCache } from "./stockCache";

describe("stockCache", () => {
  beforeEach(() => {
    stockCache.clear();
  });

  it("returns null for unknown variation", () => {
    expect(stockCache.get("VAR_X")).toBeNull();
  });

  it("set + get roundtrip", () => {
    stockCache.set("VAR_X", 7);
    expect(stockCache.get("VAR_X")).toBe(7);
  });

  it("bulkSet writes multiple entries", () => {
    stockCache.bulkSet([
      { variationId: "A", count: 1 },
      { variationId: "B", count: 2 },
    ]);
    expect(stockCache.get("A")).toBe(1);
    expect(stockCache.get("B")).toBe(2);
  });

  it("treats negative counts as 0", () => {
    stockCache.set("VAR_X", -5);
    expect(stockCache.get("VAR_X")).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- stockCache.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `stockCache.ts`**

```ts
import "server-only";

export type StockUpdate = {
  variationId: string;
  count: number;
};

class StockCache {
  private map = new Map<string, number>();

  get(variationId: string): number | null {
    const v = this.map.get(variationId);
    return v === undefined ? null : v;
  }

  set(variationId: string, count: number): void {
    this.map.set(variationId, Math.max(0, count));
  }

  bulkSet(updates: StockUpdate[]): void {
    for (const u of updates) this.set(u.variationId, u.count);
  }

  clear(): void {
    this.map.clear();
  }
}

export const stockCache = new StockCache();
```

- [ ] **Step 4: Run tests**

Run: `npm test -- stockCache.test`
Expected: PASS, 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/square/stockCache.ts src/lib/square/stockCache.test.ts
git commit -m "Add in-process stock cache with swappable interface"
```

---

## Task 5: Mappers stub + domain types

**Files:**
- Create: `src/lib/square/types.ts`
- Create: `src/lib/square/mappers.ts`
- Create: `src/lib/square/mappers.test.ts`

- [ ] **Step 1: Create internal types**

`src/lib/square/types.ts`:

```ts
export type DomainOrderLine = {
  id: string;
  itemId: string;
  qty: number;
  shell: string;
  flavorMix: Record<string, number> & { __mixItUp?: number };
};

export type SquareOrderLineItem = {
  catalogObjectId?: string;
  name?: string;
  quantity: string;
  basePriceMoney?: { amount: bigint; currency: "USD" };
  note?: string;
};

export type SquareInventoryEvent = {
  type: "inventory.count.updated";
  data: {
    object: {
      inventory_counts: Array<{
        catalog_object_id: string;
        quantity: string;
      }>;
    };
  };
};
```

- [ ] **Step 2: Write failing tests for stub mappers**

`src/lib/square/mappers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { squareLineItemsForOrderLine, applyStockEvent } from "./mappers";
import { formatFlavorMixNote } from "./mappers";

describe("formatFlavorMixNote", () => {
  it("formats standard mix in qty-descending order", () => {
    expect(
      formatFlavorMixNote(
        { id: "x", itemId: "cannoli-mini", qty: 12, shell: "plain",
          flavorMix: { original: 6, pistachio: 4, chocolate: 2 } },
        { original: "Original Ricotta", pistachio: "Pistachio", chocolate: "Chocolate Chip" }
      )
    ).toBe("Filling: 6× Original Ricotta, 4× Pistachio, 2× Chocolate Chip");
  });

  it("formats 'you decide' as chef's choice", () => {
    expect(
      formatFlavorMixNote(
        { id: "x", itemId: "cannoli-mini", qty: 12, shell: "plain",
          flavorMix: { __mixItUp: 12 } },
        {}
      )
    ).toBe("Filling: chef's choice (12)");
  });

  it("returns empty string for non-cannoli items", () => {
    expect(
      formatFlavorMixNote(
        { id: "x", itemId: "tiramisu", qty: 1, shell: "", flavorMix: {} },
        {}
      )
    ).toBe("");
  });
});

describe("squareLineItemsForOrderLine (stub)", () => {
  it("throws clear error indicating catalog mapping is required", () => {
    expect(() =>
      squareLineItemsForOrderLine(
        { id: "x", itemId: "cannoli-mini", qty: 12, shell: "plain", flavorMix: { original: 12 } }
      )
    ).toThrow(/catalog mapping/i);
  });
});

describe("applyStockEvent (stub)", () => {
  it("throws clear error indicating catalog mapping is required", () => {
    expect(() =>
      applyStockEvent({
        type: "inventory.count.updated",
        data: { object: { inventory_counts: [{ catalog_object_id: "X", quantity: "5" }] } },
      })
    ).toThrow(/catalog mapping/i);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- mappers.test`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `mappers.ts`**

```ts
import "server-only";
import type { DomainOrderLine, SquareOrderLineItem, SquareInventoryEvent } from "./types";
import type { StockUpdate } from "./stockCache";

const CATALOG_MAPPING_ERROR =
  "Square catalog mapping not configured — implement against the live Square catalog before enabling production order flow. See docs/square-setup.md.";

/**
 * Format the flavor mix as a human-readable note for the kitchen ticket.
 * This function is real (not a stub) because the format is invariant across
 * catalog setups — only the cannoli line items vary.
 */
export function formatFlavorMixNote(
  line: DomainOrderLine,
  flavorNames: Record<string, string>
): string {
  const isCannoli =
    line.itemId === "cannoli-full" ||
    line.itemId === "cannoli-mini" ||
    line.itemId === "cannoli-kit";
  if (!isCannoli) return "";

  if (line.flavorMix.__mixItUp) {
    return `Filling: chef's choice (${line.flavorMix.__mixItUp})`;
  }

  const entries = Object.entries(line.flavorMix)
    .filter(([k]) => k !== "__mixItUp")
    .filter(([, n]) => (n as number) > 0)
    .sort(([, a], [, b]) => (b as number) - (a as number));

  if (entries.length === 0) return "";

  const parts = entries.map(([id, n]) => `${n}× ${flavorNames[id] ?? id}`);
  return `Filling: ${parts.join(", ")}`;
}

/**
 * STUB — translates a domain order line into Square line items.
 * Real implementation requires live Square catalog access to know how items
 * map to variations and modifiers (especially the shell/flavor split).
 */
export function squareLineItemsForOrderLine(_line: DomainOrderLine): SquareOrderLineItem[] {
  throw new Error(CATALOG_MAPPING_ERROR);
}

/**
 * STUB — translates a Square inventory event into stock cache updates.
 * Real implementation requires knowing which Square variations the website cares about.
 */
export function applyStockEvent(_event: SquareInventoryEvent): StockUpdate[] {
  throw new Error(CATALOG_MAPPING_ERROR);
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- mappers.test`
Expected: PASS, 5 passing tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/square/types.ts src/lib/square/mappers.ts src/lib/square/mappers.test.ts
git commit -m "Add mapper stubs and flavor-mix note formatter"
```

---

## Task 6: Catalog module (price + stock fetchers)

**Files:**
- Create: `src/lib/square/catalog.ts`
- Create: `src/lib/square/catalog.test.ts`

- [ ] **Step 1: Write failing test**

`src/lib/square/catalog.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("./client", () => ({
  getSquareClient: vi.fn(),
  getSquareLocationId: vi.fn(() => "L123"),
}));

vi.mock("./stockCache", () => ({
  stockCache: { get: vi.fn(), set: vi.fn(), bulkSet: vi.fn(), clear: vi.fn() },
}));

import { getVariationPrice, getStockCount } from "./catalog";
import { getSquareClient } from "./client";
import { stockCache } from "./stockCache";

describe("catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getVariationPrice", () => {
    it("returns null when client is null", async () => {
      vi.mocked(getSquareClient).mockReturnValue(null);
      expect(await getVariationPrice("VAR_X")).toBeNull();
    });

    it("returns price in dollars from Square variation", async () => {
      const fakeClient = {
        catalogApi: {
          retrieveCatalogObject: vi.fn(async () => ({
            result: {
              object: {
                type: "ITEM_VARIATION",
                itemVariationData: { priceMoney: { amount: 450n, currency: "USD" } },
              },
            },
          })),
        },
      };
      vi.mocked(getSquareClient).mockReturnValue(fakeClient as never);
      expect(await getVariationPrice("VAR_X")).toBe(4.5);
    });
  });

  describe("getStockCount", () => {
    it("returns cached value when present", async () => {
      vi.mocked(stockCache.get).mockReturnValue(3);
      expect(await getStockCount("VAR_X")).toBe(3);
    });

    it("returns null when client is null and cache miss", async () => {
      vi.mocked(stockCache.get).mockReturnValue(null);
      vi.mocked(getSquareClient).mockReturnValue(null);
      expect(await getStockCount("VAR_X")).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- catalog.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `catalog.ts`**

```ts
import "server-only";
import { getSquareClient } from "./client";
import { stockCache } from "./stockCache";

const PRICE_TTL_MS = 60_000;
const priceCache = new Map<string, { value: number; expiresAt: number }>();

export async function getVariationPrice(variationId: string): Promise<number | null> {
  const now = Date.now();
  const cached = priceCache.get(variationId);
  if (cached && cached.expiresAt > now) return cached.value;

  const client = getSquareClient();
  if (!client) return null;

  try {
    const res = await client.catalogApi.retrieveCatalogObject(variationId, false);
    const obj = res.result.object;
    if (!obj || obj.type !== "ITEM_VARIATION") return null;
    const amount = obj.itemVariationData?.priceMoney?.amount;
    if (amount == null) return null;
    const dollars = Number(amount) / 100;
    priceCache.set(variationId, { value: dollars, expiresAt: now + PRICE_TTL_MS });
    return dollars;
  } catch {
    return null;
  }
}

export async function getStockCount(variationId: string): Promise<number | null> {
  const cached = stockCache.get(variationId);
  if (cached !== null) return cached;

  const client = getSquareClient();
  if (!client) return null;

  try {
    const res = await client.inventoryApi.batchRetrieveInventoryCounts({
      catalogObjectIds: [variationId],
    });
    const counts = res.result.counts ?? [];
    const total = counts.reduce((sum, c) => sum + Number(c.quantity ?? 0), 0);
    stockCache.set(variationId, total);
    return total;
  } catch {
    return null;
  }
}

export function _resetPriceCache(): void {
  priceCache.clear();
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- catalog.test`
Expected: PASS, 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/square/catalog.ts src/lib/square/catalog.test.ts
git commit -m "Add catalog price + stock fetchers with caching"
```

---

## Task 7: Orders module (Square order builder)

**Files:**
- Create: `src/lib/square/orders.ts`
- Create: `src/lib/square/orders.test.ts`

- [ ] **Step 1: Write failing test**

`src/lib/square/orders.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./client", () => ({
  getSquareClient: vi.fn(),
  getSquareLocationId: vi.fn(() => "L123"),
}));

vi.mock("./mappers", async () => {
  const actual = await vi.importActual<typeof import("./mappers")>("./mappers");
  return {
    ...actual,
    squareLineItemsForOrderLine: vi.fn(() => [
      { name: "Cannoli — Mini", quantity: "12", basePriceMoney: { amount: 225n, currency: "USD" } },
    ]),
  };
});

import { createDraftOrder } from "./orders";
import { getSquareClient } from "./client";

const baseOrder = {
  date: "2026-05-10",
  time: "12:00pm",
  lines: [
    { id: "L1", itemId: "cannoli-mini", qty: 12, shell: "plain", flavorMix: { original: 12 } },
  ],
  fulfillment: "pickup" as const,
  zone: null,
  address: { street: "", apt: "", city: "", zip: "" },
  deliveryNotes: "",
  contact: { name: "Test", phone: "5555555555", email: "t@example.com" },
  flavorNames: { original: "Original Ricotta" },
};

describe("createDraftOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws SQUARE_NOT_CONFIGURED when client is null", async () => {
    vi.mocked(getSquareClient).mockReturnValue(null);
    await expect(createDraftOrder(baseOrder, "idem-1")).rejects.toThrow(/not configured/i);
  });

  it("builds order with line items, fulfillment PICKUP, and idempotency key", async () => {
    const createOrder = vi.fn(async () => ({
      result: {
        order: {
          id: "ORDER_123",
          totalMoney: { amount: 2700n, currency: "USD" },
          totalServiceChargeMoney: { amount: 0n, currency: "USD" },
        },
      },
    }));
    vi.mocked(getSquareClient).mockReturnValue({ ordersApi: { createOrder } } as never);

    const res = await createDraftOrder(baseOrder, "idem-1");

    expect(res).toEqual({
      orderId: "ORDER_123",
      totals: { subtotal: 27, fees: 0, total: 27 },
    });
    expect(createOrder).toHaveBeenCalledOnce();
    const arg = createOrder.mock.calls[0][0];
    expect(arg.idempotencyKey).toBe("idem-1");
    expect(arg.order.locationId).toBe("L123");
    expect(arg.order.fulfillments[0].type).toBe("PICKUP");
  });

  it("adds delivery service charge when zone has fee", async () => {
    const createOrder = vi.fn(async () => ({
      result: {
        order: {
          id: "ORDER_456",
          totalMoney: { amount: 3500n, currency: "USD" },
          totalServiceChargeMoney: { amount: 800n, currency: "USD" },
        },
      },
    }));
    vi.mocked(getSquareClient).mockReturnValue({ ordersApi: { createOrder } } as never);

    const deliveryOrder = {
      ...baseOrder,
      fulfillment: "delivery" as const,
      zone: { id: "local", label: "Local", radius: "0-8mi", fee: 8, eta: "30-45min", auto: true },
      address: { street: "1 Main", apt: "", city: "San Mateo", zip: "94401" },
    };

    await createDraftOrder(deliveryOrder, "idem-2");
    const arg = createOrder.mock.calls[0][0];
    expect(arg.order.serviceCharges[0].amountMoney.amount).toBe(800n);
    expect(arg.order.fulfillments[0].type).toBe("SHIPMENT");
  });

  it("adds Sunday delivery surcharge of $5", async () => {
    const createOrder = vi.fn(async () => ({
      result: { order: { id: "X", totalMoney: { amount: 100n, currency: "USD" } } },
    }));
    vi.mocked(getSquareClient).mockReturnValue({ ordersApi: { createOrder } } as never);

    const sundayOrder = {
      ...baseOrder,
      date: "2026-05-10",
      fulfillment: "delivery" as const,
      zone: { id: "local", label: "Local", radius: "0-8mi", fee: 8, eta: "30-45min", auto: true },
    };

    await createDraftOrder(sundayOrder, "idem-3");
    const arg = createOrder.mock.calls[0][0];
    const sundayCharge = arg.order.serviceCharges.find(
      (c: { name: string }) => c.name === "Sunday delivery"
    );
    expect(sundayCharge.amountMoney.amount).toBe(500n);
  });
});
```

> Note: 2026-05-10 is a Sunday. If running this in the future, swap the date for any Sunday.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- orders.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `orders.ts`**

```ts
import "server-only";
import { getSquareClient, getSquareLocationId } from "./client";
import { squareLineItemsForOrderLine, formatFlavorMixNote } from "./mappers";
import type { DomainOrderLine } from "./types";

export type DomainOrderInput = {
  date: string;
  time: string;
  lines: DomainOrderLine[];
  fulfillment: "pickup" | "delivery";
  zone: { id: string; label: string; fee: number | null; auto: boolean } | null;
  address: { street: string; apt: string; city: string; zip: string };
  deliveryNotes: string;
  contact: { name: string; phone: string; email: string };
  flavorNames: Record<string, string>;
};

export type CreatedOrder = {
  orderId: string;
  totals: { subtotal: number; fees: number; total: number };
};

const SUNDAY_SURCHARGE_CENTS = 500n;

function isSunday(dateString: string): boolean {
  return new Date(dateString + "T00:00:00").getDay() === 0;
}

function pickupAtIso(date: string, time: string): string {
  const [hourMin, ampm] = time.split(/(am|pm)/i);
  const [hStr, mStr = "0"] = hourMin.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (ampm.toLowerCase() === "pm" && h !== 12) h += 12;
  if (ampm.toLowerCase() === "am" && h === 12) h = 0;
  return `${date}T${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`;
}

export async function createDraftOrder(
  input: DomainOrderInput,
  idempotencyKey: string
): Promise<CreatedOrder> {
  const client = getSquareClient();
  const locationId = getSquareLocationId();
  if (!client || !locationId) {
    throw new Error("SQUARE_NOT_CONFIGURED");
  }

  const lineItems = input.lines.flatMap((line) => {
    const items = squareLineItemsForOrderLine(line);
    const note = formatFlavorMixNote(line, input.flavorNames);
    return items.map((it) => ({ ...it, note: note || it.note }));
  });

  const serviceCharges: Array<{
    name: string;
    amountMoney: { amount: bigint; currency: "USD" };
    calculationPhase: "TOTAL_PHASE";
  }> = [];

  if (input.fulfillment === "delivery" && input.zone?.auto && input.zone.fee != null) {
    serviceCharges.push({
      name: `Delivery — ${input.zone.label}`,
      amountMoney: { amount: BigInt(input.zone.fee * 100), currency: "USD" },
      calculationPhase: "TOTAL_PHASE",
    });
    if (isSunday(input.date)) {
      serviceCharges.push({
        name: "Sunday delivery",
        amountMoney: { amount: SUNDAY_SURCHARGE_CENTS, currency: "USD" },
        calculationPhase: "TOTAL_PHASE",
      });
    }
  }

  const fulfillment = input.fulfillment === "pickup"
    ? {
        type: "PICKUP" as const,
        pickupDetails: {
          recipient: {
            displayName: input.contact.name,
            phoneNumber: input.contact.phone,
            emailAddress: input.contact.email,
          },
          pickupAt: pickupAtIso(input.date, input.time),
          note: "Online order — Romolo's web",
        },
      }
    : {
        type: "SHIPMENT" as const,
        shipmentDetails: {
          recipient: {
            displayName: input.contact.name,
            phoneNumber: input.contact.phone,
            emailAddress: input.contact.email,
            address: {
              addressLine1: input.address.street,
              addressLine2: input.address.apt || undefined,
              locality: input.address.city,
              postalCode: input.address.zip,
              country: "US",
            },
          },
          expectedShippedAt: pickupAtIso(input.date, input.time),
          shippingNote: input.deliveryNotes || undefined,
        },
      };

  const res = await client.ordersApi.createOrder({
    idempotencyKey,
    order: {
      locationId,
      lineItems,
      serviceCharges,
      fulfillments: [fulfillment],
    },
  });

  const order = res.result.order;
  if (!order?.id) throw new Error("Square createOrder returned no order id");

  const total = Number(order.totalMoney?.amount ?? 0n) / 100;
  const fees = Number(order.totalServiceChargeMoney?.amount ?? 0n) / 100;
  const subtotal = total - fees;

  return {
    orderId: order.id,
    totals: { subtotal, fees, total },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- orders.test`
Expected: PASS, 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/square/orders.ts src/lib/square/orders.test.ts
git commit -m "Add Square draft order builder with delivery and Sunday surcharge"
```

---

## Task 8: Payments module

**Files:**
- Create: `src/lib/square/payments.ts`
- Create: `src/lib/square/payments.test.ts`

- [ ] **Step 1: Write failing test**

`src/lib/square/payments.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./client", () => ({
  getSquareClient: vi.fn(),
  getSquareLocationId: vi.fn(() => "L123"),
}));

import { chargeOrder } from "./payments";
import { getSquareClient } from "./client";

describe("chargeOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws SQUARE_NOT_CONFIGURED when client null", async () => {
    vi.mocked(getSquareClient).mockReturnValue(null);
    await expect(
      chargeOrder({ orderId: "O1", sourceId: "tok", idempotencyKey: "i1", amountCents: 2700n })
    ).rejects.toThrow(/not configured/i);
  });

  it("creates a payment linked to the order", async () => {
    const createPayment = vi.fn(async () => ({
      result: {
        payment: {
          id: "PAY_X",
          status: "COMPLETED",
          receiptUrl: "https://squareup.com/receipt/X",
        },
      },
    }));
    vi.mocked(getSquareClient).mockReturnValue({ paymentsApi: { createPayment } } as never);

    const res = await chargeOrder({
      orderId: "O1",
      sourceId: "tok",
      idempotencyKey: "i1",
      amountCents: 2700n,
    });

    expect(res).toEqual({
      paymentId: "PAY_X",
      status: "COMPLETED",
      receiptUrl: "https://squareup.com/receipt/X",
    });
    const arg = createPayment.mock.calls[0][0];
    expect(arg.sourceId).toBe("tok");
    expect(arg.idempotencyKey).toBe("i1");
    expect(arg.orderId).toBe("O1");
    expect(arg.amountMoney.amount).toBe(2700n);
    expect(arg.locationId).toBe("L123");
  });

  it("maps GENERIC_DECLINE to CARD_DECLINED error", async () => {
    const createPayment = vi.fn(async () => {
      const err = new Error("Declined") as Error & { errors?: Array<{ code: string }> };
      err.errors = [{ code: "GENERIC_DECLINE" }];
      throw err;
    });
    vi.mocked(getSquareClient).mockReturnValue({ paymentsApi: { createPayment } } as never);

    await expect(
      chargeOrder({ orderId: "O1", sourceId: "tok", idempotencyKey: "i1", amountCents: 100n })
    ).rejects.toThrow(/CARD_DECLINED/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- payments.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `payments.ts`**

```ts
import "server-only";
import { getSquareClient, getSquareLocationId } from "./client";

export type ChargeInput = {
  orderId: string;
  sourceId: string;
  idempotencyKey: string;
  amountCents: bigint;
};

export type ChargeResult = {
  paymentId: string;
  status: string;
  receiptUrl: string | null;
};

const DECLINE_CODES = new Set([
  "GENERIC_DECLINE",
  "CARD_DECLINED",
  "CARD_DECLINED_VERIFICATION_REQUIRED",
  "CARD_DECLINED_CALL_ISSUER",
  "INSUFFICIENT_FUNDS",
  "CVV_FAILURE",
  "INVALID_EXPIRATION",
  "EXPIRATION_FAILURE",
]);

export async function chargeOrder(input: ChargeInput): Promise<ChargeResult> {
  const client = getSquareClient();
  const locationId = getSquareLocationId();
  if (!client || !locationId) throw new Error("SQUARE_NOT_CONFIGURED");

  try {
    const res = await client.paymentsApi.createPayment({
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey,
      orderId: input.orderId,
      amountMoney: { amount: input.amountCents, currency: "USD" },
      locationId,
      autocomplete: true,
    });
    const payment = res.result.payment;
    if (!payment?.id) throw new Error("Square createPayment returned no payment id");
    return {
      paymentId: payment.id,
      status: payment.status ?? "UNKNOWN",
      receiptUrl: payment.receiptUrl ?? null,
    };
  } catch (e) {
    const errors = (e as { errors?: Array<{ code?: string }> }).errors ?? [];
    if (errors.some((err) => DECLINE_CODES.has(err.code ?? ""))) {
      throw new Error("CARD_DECLINED");
    }
    throw e;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- payments.test`
Expected: PASS, 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/square/payments.ts src/lib/square/payments.test.ts
git commit -m "Add Square payment charging with decline error mapping"
```

---

## Task 9: Webhook signature verification + event router

**Files:**
- Create: `src/lib/square/webhooks.ts`
- Create: `src/lib/square/webhooks.test.ts`

- [ ] **Step 1: Write failing test**

`src/lib/square/webhooks.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHmac } from "node:crypto";

const ORIGINAL_ENV = { ...process.env };

function sign(key: string, notificationUrl: string, body: string): string {
  return createHmac("sha256", key).update(notificationUrl + body).digest("base64");
}

describe("verifyWebhookSignature", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SQUARE_ENV = "sandbox";
    process.env.SQUARE_ACCESS_TOKEN = "EAAAxxx";
    process.env.SQUARE_LOCATION_ID = "L1";
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = "whk-secret";
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns true for valid signature", async () => {
    const { verifyWebhookSignature } = await import("./webhooks");
    const url = "https://example.com/api/webhooks/square";
    const body = '{"type":"inventory.count.updated"}';
    const sig = sign("whk-secret", url, body);
    expect(verifyWebhookSignature({ url, body, signatureHeader: sig })).toBe(true);
  });

  it("returns false for tampered body", async () => {
    const { verifyWebhookSignature } = await import("./webhooks");
    const url = "https://example.com/api/webhooks/square";
    const sig = sign("whk-secret", url, '{"type":"original"}');
    expect(
      verifyWebhookSignature({ url, body: '{"type":"tampered"}', signatureHeader: sig })
    ).toBe(false);
  });

  it("returns false for wrong key", async () => {
    const { verifyWebhookSignature } = await import("./webhooks");
    const url = "https://example.com/api/webhooks/square";
    const body = '{"type":"x"}';
    const sig = sign("wrong-key", url, body);
    expect(verifyWebhookSignature({ url, body, signatureHeader: sig })).toBe(false);
  });

  it("returns false when key not configured", async () => {
    delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    vi.resetModules();
    const { verifyWebhookSignature } = await import("./webhooks");
    expect(
      verifyWebhookSignature({
        url: "https://x",
        body: "{}",
        signatureHeader: "anything",
      })
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- webhooks.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `webhooks.ts`**

```ts
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { squareEnv } from "./env";
import { stockCache } from "./stockCache";
import { applyStockEvent } from "./mappers";
import type { SquareInventoryEvent } from "./types";

export type VerifyInput = {
  url: string;
  body: string;
  signatureHeader: string | null;
};

export function verifyWebhookSignature({ url, body, signatureHeader }: VerifyInput): boolean {
  const env = squareEnv();
  if (!env || !signatureHeader) return false;

  const expected = createHmac("sha256", env.webhookSignatureKey)
    .update(url + body)
    .digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;

  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type WebhookHandlerResult = { handled: boolean; type: string };

export function routeEvent(event: { type?: string; data?: unknown }): WebhookHandlerResult {
  const type = event.type ?? "";
  switch (type) {
    case "inventory.count.updated": {
      try {
        const updates = applyStockEvent(event as SquareInventoryEvent);
        stockCache.bulkSet(updates);
      } catch {
        // Mapper stub throws when catalog mapping is not yet implemented.
        // Webhook still acknowledged so Square stops retrying.
      }
      return { handled: true, type };
    }
    case "payment.updated":
    case "order.updated":
      return { handled: true, type };
    default:
      return { handled: false, type };
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- webhooks.test`
Expected: PASS, 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/square/webhooks.ts src/lib/square/webhooks.test.ts
git commit -m "Add Square webhook signature verification and event router"
```

---

## Task 10: Extend data types with Square fields

**Files:**
- Modify: `src/lib/data.ts`

- [ ] **Step 1: Add Square fields to `MenuItem` type**

In `src/lib/data.ts`, replace the `MenuItem` type (lines 1–8):

```ts
export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Optional thumbnail in the menu grid */
  imageUrl?: string;

  // Square mapping — fill in when creds arrive
  squareItemId?: string;
  squareVariationId?: string;
  trackStock?: boolean;
};
```

- [ ] **Step 2: Add Square field to `Flavor` type**

In `src/lib/data.ts`, replace the `Flavor` type (around lines 116–122):

```ts
export type Flavor = {
  id: string;
  name: string;
  available: boolean;
  today: boolean;
  color: string;
  squareVariationId?: string;
};
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors. The new fields are optional, so existing entries don't need changes.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data.ts
git commit -m "Add optional Square ID fields to MenuItem and Flavor"
```

---

## Task 11: Menu loader (`src/lib/menu.ts`)

**Files:**
- Create: `src/lib/menu.ts`
- Create: `src/lib/menu.test.ts`

- [ ] **Step 1: Write failing test**

`src/lib/menu.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./square/env", () => ({
  isSquareConfigured: false,
  squareEnv: () => null,
  publicSquareConfig: () => ({ appId: null, locationId: null, mode: null }),
}));

vi.mock("./square/catalog", () => ({
  getVariationPrice: vi.fn(),
  getStockCount: vi.fn(),
}));

import { loadMenu } from "./menu";
import { getVariationPrice, getStockCount } from "./square/catalog";
import { MENU_DATA } from "./data";

describe("loadMenu", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns static menu unchanged when Square is not configured", async () => {
    const menu = await loadMenu();
    expect(menu.categories).toEqual(MENU_DATA);
    expect(menu.syncedAt).toBeInstanceOf(Date);
    expect(getVariationPrice).not.toHaveBeenCalled();
  });

  it("overrides price from Square when squareVariationId set", async () => {
    vi.doMock("./data", async () => {
      const actual = await vi.importActual<typeof import("./data")>("./data");
      return {
        ...actual,
        MENU_DATA: [
          {
            category: "Test",
            squareSyncedAt: "",
            items: [
              { id: "x", name: "X", description: "", price: 1, squareVariationId: "VAR_X" },
            ],
          },
        ],
        INITIAL_FLAVORS: [],
      };
    });
    vi.doMock("./square/env", () => ({
      isSquareConfigured: true,
      squareEnv: () => ({ mode: "sandbox" }),
      publicSquareConfig: () => ({ appId: "a", locationId: "L", mode: "sandbox" }),
    }));
    vi.mocked(getVariationPrice).mockResolvedValue(9.99);

    vi.resetModules();
    const { loadMenu: loadFresh } = await import("./menu");
    const menu = await loadFresh();
    expect(menu.categories[0].items[0].price).toBe(9.99);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- menu.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `menu.ts`**

```ts
import "server-only";
import { MENU_DATA, INITIAL_FLAVORS, type MenuCategory, type Flavor } from "./data";
import { isSquareConfigured } from "./square/env";
import { getVariationPrice, getStockCount } from "./square/catalog";

export type LoadedMenu = {
  categories: MenuCategory[];
  flavors: Flavor[];
  syncedAt: Date;
};

export async function loadMenu(): Promise<LoadedMenu> {
  const syncedAt = new Date();

  if (!isSquareConfigured) {
    return { categories: MENU_DATA, flavors: INITIAL_FLAVORS, syncedAt };
  }

  const categories = await Promise.all(
    MENU_DATA.map(async (cat) => ({
      ...cat,
      items: await Promise.all(
        cat.items.map(async (item) => {
          if (!item.squareVariationId) return item;
          const [price, stock] = await Promise.all([
            getVariationPrice(item.squareVariationId),
            item.trackStock ? getStockCount(item.squareVariationId) : Promise.resolve(null),
          ]);
          return {
            ...item,
            price: price ?? item.price,
            ...(stock !== null ? { _stockCount: stock } : {}),
          } as typeof item & { _stockCount?: number };
        })
      ),
    }))
  );

  const flavors = await Promise.all(
    INITIAL_FLAVORS.map(async (f) => {
      if (!f.squareVariationId) return f;
      const stock = await getStockCount(f.squareVariationId);
      if (stock === null) return f;
      return { ...f, available: stock > 0 };
    })
  );

  return { categories, flavors, syncedAt };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- menu.test`
Expected: PASS, 2 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/menu.ts src/lib/menu.test.ts
git commit -m "Add loadMenu() merging static catalog with Square data"
```

---

## Task 12: GET /api/menu route

**Files:**
- Create: `src/app/api/menu/route.ts`

- [ ] **Step 1: Implement route**

```ts
import { NextResponse } from "next/server";
import { loadMenu } from "@/lib/menu";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
  try {
    const menu = await loadMenu();
    return NextResponse.json(menu, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "MENU_LOAD_FAILED", message: (e as Error).message } },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify in dev server**

Run: `npm run dev`
In a second terminal: `curl http://localhost:3000/api/menu | head -50`
Expected: JSON response with `categories`, `flavors`, `syncedAt`. Should match the current static `MENU_DATA` since Square isn't configured locally.
Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/menu/route.ts
git commit -m "Add GET /api/menu route returning merged static + Square menu"
```

---

## Task 13: POST /api/orders route

**Files:**
- Create: `src/app/api/orders/route.ts`
- Create: `src/app/api/orders/route.test.ts`

- [ ] **Step 1: Write failing test**

`src/app/api/orders/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/square/env", () => ({ isSquareConfigured: false }));
vi.mock("@/lib/square/orders", () => ({ createDraftOrder: vi.fn() }));

import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/orders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 503 SQUARE_NOT_CONFIGURED when not configured", async () => {
    const res = await POST(makeRequest({
      date: "2026-05-10", time: "12:00pm",
      lines: [{ id: "1", itemId: "cannoli-mini", qty: 12, shell: "plain", flavorMix: { original: 12 } }],
      fulfillment: "pickup", zone: null,
      address: { street: "", apt: "", city: "", zip: "" },
      deliveryNotes: "",
      contact: { name: "T", phone: "5551234", email: "t@e.com" },
      idempotencyKey: "i1",
      flavorNames: { original: "Original" },
    }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("SQUARE_NOT_CONFIGURED");
  });

  it("returns 400 VALIDATION when body is malformed", async () => {
    const res = await POST(makeRequest({ wrong: "shape" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api/orders/route.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement route**

`src/app/api/orders/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { isSquareConfigured } from "@/lib/square/env";
import { createDraftOrder } from "@/lib/square/orders";

const OrderLineSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  qty: z.number().int().positive(),
  shell: z.string(),
  flavorMix: z.record(z.string(), z.number()).default({}),
});

const OrderSchema = z.object({
  date: z.string(),
  time: z.string(),
  lines: z.array(OrderLineSchema).min(1),
  fulfillment: z.enum(["pickup", "delivery"]),
  zone: z
    .object({
      id: z.string(),
      label: z.string(),
      fee: z.number().nullable(),
      auto: z.boolean(),
    })
    .nullable(),
  address: z.object({
    street: z.string(),
    apt: z.string(),
    city: z.string(),
    zip: z.string(),
  }),
  deliveryNotes: z.string(),
  contact: z.object({
    name: z.string().min(1),
    phone: z.string().min(7),
    email: z.string().email(),
  }),
  idempotencyKey: z.string().min(8),
  flavorNames: z.record(z.string(), z.string()),
});

export async function POST(req: Request) {
  if (!isSquareConfigured) {
    return NextResponse.json(
      {
        error: {
          code: "SQUARE_NOT_CONFIGURED",
          message: "Online ordering is not yet configured.",
        },
      },
      { status: 503 }
    );
  }

  let parsed;
  try {
    const json = await req.json();
    parsed = OrderSchema.parse(json);
  } catch (e) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: "Invalid order payload.",
          details: e instanceof z.ZodError ? e.flatten() : String(e),
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await createDraftOrder(
      {
        date: parsed.date,
        time: parsed.time,
        lines: parsed.lines.map((l) => ({
          id: l.id,
          itemId: l.itemId,
          qty: l.qty,
          shell: l.shell,
          flavorMix: l.flavorMix,
        })),
        fulfillment: parsed.fulfillment,
        zone: parsed.zone,
        address: parsed.address,
        deliveryNotes: parsed.deliveryNotes,
        contact: parsed.contact,
        flavorNames: parsed.flavorNames,
      },
      parsed.idempotencyKey
    );
    return NextResponse.json(result);
  } catch (e) {
    const message = (e as Error).message;
    if (message === "SQUARE_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: { code: "SQUARE_NOT_CONFIGURED", message: "Square not configured." } },
        { status: 503 }
      );
    }
    if (message.includes("catalog mapping")) {
      return NextResponse.json(
        {
          error: {
            code: "SQUARE_NOT_CONFIGURED",
            message: "Square catalog mapping not yet configured.",
          },
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: { code: "SQUARE_UNAVAILABLE", message } },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- api/orders/route.test`
Expected: PASS, 2 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/orders/route.ts src/app/api/orders/route.test.ts
git commit -m "Add POST /api/orders with Zod validation and degraded mode"
```

---

## Task 14: POST /api/orders/pay route

**Files:**
- Create: `src/app/api/orders/pay/route.ts`
- Create: `src/app/api/orders/pay/route.test.ts`

- [ ] **Step 1: Write failing test**

`src/app/api/orders/pay/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/square/env", () => ({ isSquareConfigured: true }));
vi.mock("@/lib/square/payments", () => ({ chargeOrder: vi.fn() }));

import { POST } from "./route";
import { chargeOrder } from "@/lib/square/payments";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/orders/pay", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/orders/pay", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns confirmation on success", async () => {
    vi.mocked(chargeOrder).mockResolvedValue({
      paymentId: "PAY1",
      status: "COMPLETED",
      receiptUrl: "https://r/x",
    });
    const res = await POST(makeRequest({
      orderId: "O1",
      sourceId: "tok",
      idempotencyKey: "i1",
      amountCents: "2700",
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.paymentId).toBe("PAY1");
    expect(body.confirmation).toMatch(/^PAY1$/);
  });

  it("returns 402 CARD_DECLINED on decline", async () => {
    vi.mocked(chargeOrder).mockRejectedValue(new Error("CARD_DECLINED"));
    const res = await POST(makeRequest({
      orderId: "O1",
      sourceId: "tok",
      idempotencyKey: "i1",
      amountCents: "2700",
    }));
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error.code).toBe("CARD_DECLINED");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- pay/route.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement route**

`src/app/api/orders/pay/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { isSquareConfigured } from "@/lib/square/env";
import { chargeOrder } from "@/lib/square/payments";

const PaySchema = z.object({
  orderId: z.string().min(1),
  sourceId: z.string().min(1),
  idempotencyKey: z.string().min(8),
  amountCents: z.string().regex(/^\d+$/),
});

export async function POST(req: Request) {
  if (!isSquareConfigured) {
    return NextResponse.json(
      { error: { code: "SQUARE_NOT_CONFIGURED", message: "Payments not configured." } },
      { status: 503 }
    );
  }

  let parsed;
  try {
    parsed = PaySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: "Invalid payment payload.",
          details: e instanceof z.ZodError ? e.flatten() : String(e),
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await chargeOrder({
      orderId: parsed.orderId,
      sourceId: parsed.sourceId,
      idempotencyKey: parsed.idempotencyKey,
      amountCents: BigInt(parsed.amountCents),
    });
    return NextResponse.json({
      confirmation: result.paymentId,
      paymentId: result.paymentId,
      status: result.status,
      receiptUrl: result.receiptUrl,
    });
  } catch (e) {
    const message = (e as Error).message;
    if (message === "CARD_DECLINED") {
      return NextResponse.json(
        { error: { code: "CARD_DECLINED", message: "Card was declined." } },
        { status: 402 }
      );
    }
    if (message === "SQUARE_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: { code: "SQUARE_NOT_CONFIGURED", message: "Payments not configured." } },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: { code: "SQUARE_UNAVAILABLE", message } },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- pay/route.test`
Expected: PASS, 2 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/orders/pay/route.ts src/app/api/orders/pay/route.test.ts
git commit -m "Add POST /api/orders/pay route with decline mapping"
```

---

## Task 15: POST /api/webhooks/square route

**Files:**
- Create: `src/app/api/webhooks/square/route.ts`
- Create: `src/app/api/webhooks/square/route.test.ts`

- [ ] **Step 1: Write failing test**

`src/app/api/webhooks/square/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/square/webhooks", () => ({
  verifyWebhookSignature: vi.fn(),
  routeEvent: vi.fn(() => ({ handled: true, type: "inventory.count.updated" })),
}));

import { POST } from "./route";
import { verifyWebhookSignature } from "@/lib/square/webhooks";

function makeRequest(body: string, sig: string | null): Request {
  return new Request("http://localhost/api/webhooks/square", {
    method: "POST",
    headers: sig
      ? { "content-type": "application/json", "x-square-hmacsha256-signature": sig }
      : { "content-type": "application/json" },
    body,
  });
}

describe("POST /api/webhooks/square", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when signature missing", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(false);
    const res = await POST(makeRequest('{"type":"x"}', null));
    expect(res.status).toBe(401);
  });

  it("returns 401 when signature invalid", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(false);
    const res = await POST(makeRequest('{"type":"x"}', "bad"));
    expect(res.status).toBe(401);
  });

  it("returns 200 when signature valid", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
    const res = await POST(makeRequest('{"type":"inventory.count.updated"}', "good"));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- webhooks/square/route.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement route**

`src/app/api/webhooks/square/route.ts`:

```ts
import { NextResponse } from "next/server";
import { verifyWebhookSignature, routeEvent } from "@/lib/square/webhooks";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const signatureHeader = req.headers.get("x-square-hmacsha256-signature");
  const url = req.url;

  const valid = verifyWebhookSignature({ url, body, signatureHeader });
  if (!valid) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  routeEvent(event);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- webhooks/square/route.test`
Expected: PASS, 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/webhooks/square/route.ts src/app/api/webhooks/square/route.test.ts
git commit -m "Add POST /api/webhooks/square with signature verification"
```

---

## Task 16: Update OrderProvider to accept initial server data

**Files:**
- Modify: `src/components/OrderProvider.tsx`

- [ ] **Step 1: Add `initialFlavors` prop**

Replace the `OrderProvider` function signature and the `useState` line in `src/components/OrderProvider.tsx`:

```tsx
export function OrderProvider({
  children,
  initialFlavors,
}: {
  children: ReactNode;
  initialFlavors?: Flavor[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [flavors, setFlavors] = useState<Flavor[]>(initialFlavors ?? INITIAL_FLAVORS);
  // ... rest unchanged
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors. The prop is optional so existing call sites compile unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/components/OrderProvider.tsx
git commit -m "Allow OrderProvider to seed flavors from server data"
```

---

## Task 17: Server-side menu fetch in page.tsx

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Make page async + fetch menu**

Replace `src/app/page.tsx`:

```tsx
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Heritage from "@/components/Heritage";
import Process from "@/components/Process";
import Menu from "@/components/Menu";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import Location from "@/components/Location";
import Footer from "@/components/Footer";
import ScrollAnimator from "@/components/ScrollAnimator";
import { OrderProvider } from "@/components/OrderProvider";
import OrderFlowMount from "@/components/OrderFlowMount";
import { loadMenu } from "@/lib/menu";

export const revalidate = 60;

export default async function Home() {
  const { categories, flavors, syncedAt } = await loadMenu();

  return (
    <OrderProvider initialFlavors={flavors}>
      <ScrollAnimator />
      <Navbar />
      <main>
        <Hero />
        <Heritage />
        <Process />
        <Menu categories={categories} syncedAt={syncedAt} />
        <Testimonials />
        <Contact />
        <Location />
      </main>
      <Footer />
      <OrderFlowMount />
    </OrderProvider>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: ERROR — `Menu` component doesn't yet accept `categories` / `syncedAt` props. This is expected and fixed in Task 18.

- [ ] **Step 3: Defer commit**

Don't commit yet — the build is broken until Task 18 lands.

---

## Task 18: Update Menu.tsx to accept loaded data + render stock UI

**Files:**
- Modify: `src/components/Menu.tsx`

- [ ] **Step 1: Read current Menu.tsx fully**

Run: `cat src/components/Menu.tsx`
Identify how `MENU_DATA` is consumed and where `squareSyncedAt` is rendered.

- [ ] **Step 2: Refactor signature + replace static reads**

In `src/components/Menu.tsx`, change the imports and component signature:

Replace:
```tsx
import { MENU_DATA, fmt } from "@/lib/data";
```

With:
```tsx
import { fmt, type MenuCategory } from "@/lib/data";
```

Replace the function signature line:
```tsx
export default function Menu() {
```

With:
```tsx
type MenuItemWithStock = MenuCategory["items"][number] & { _stockCount?: number };
type MenuCategoryWithStock = Omit<MenuCategory, "items"> & { items: MenuItemWithStock[] };

export default function Menu({
  categories,
  syncedAt,
}: {
  categories: MenuCategoryWithStock[];
  syncedAt: Date;
}) {
```

Find every reference to `MENU_DATA` in the file (use `grep MENU_DATA src/components/Menu.tsx` to list them) and replace with `categories`.

Find references to `cat.squareSyncedAt` (or similar timestamp display) and replace with the formatted `syncedAt`. Add a helper at the top of the component body:

```tsx
const syncedRelative = formatRelative(syncedAt);
```

And at the top of the file, outside the component:

```tsx
function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  return date.toLocaleDateString();
}
```

- [ ] **Step 3: Add sold-out + low-stock UI**

In the JSX where each item card is rendered, find the outer `<button>` or `<div>` for an item and wrap its content with stock checks. Identify the variable name for the current item in the map (likely `item`). Add at the top of the map callback:

```tsx
const stock = item._stockCount;
const soldOut = item.trackStock && stock === 0;
const lowStock = item.trackStock && stock !== undefined && stock > 0 && stock <= 5;
```

Then either disable the click and add a "Sold out today" overlay when `soldOut`, or add a "Only N left" badge when `lowStock`. Apply these visually:

```tsx
{soldOut && (
  <div className="absolute inset-0 bg-white/70 flex items-center justify-center pointer-events-none">
    <span className="text-[11px] tracking-[0.2em] uppercase text-romolo-red font-bold">
      Sold out today
    </span>
  </div>
)}
{lowStock && !soldOut && (
  <span className="absolute top-2 right-2 px-2 py-0.5 bg-romolo-red text-white text-[10px] tracking-[0.1em] uppercase rounded">
    Only {stock} left
  </span>
)}
```

(The exact JSX structure depends on the current Menu layout — apply these as overlays positioned absolutely on the item card. The card's containing element must be `position: relative`.)

- [ ] **Step 4: Verify TypeScript compiles + dev server boots**

Run: `npx tsc --noEmit`
Expected: No errors.

Run: `npm run dev`
Visit `http://localhost:3000`. Expected: site looks visually identical to before (no items have `trackStock=true` yet, so no stock UI renders). The "synced X min ago" timestamp shows a real value derived from page-render time.
Stop the dev server.

- [ ] **Step 5: Commit (Tasks 17 + 18 together)**

```bash
git add src/app/page.tsx src/components/Menu.tsx
git commit -m "Wire Menu to server-loaded data with sold-out and low-stock UI"
```

---

## Task 19: SquareCard component

**Files:**
- Create: `src/components/SquareCard.tsx`

- [ ] **Step 1: Implement component**

```tsx
"use client";

import { useEffect, useId, useRef, useState } from "react";

type Card = {
  attach: (selector: string) => Promise<void>;
  destroy: () => Promise<void>;
  tokenize: () => Promise<{
    status: "OK" | "ERROR";
    token?: string;
    errors?: Array<{ message: string }>;
  }>;
};

type Payments = {
  card: () => Promise<Card>;
};

declare global {
  interface Window {
    Square?: { payments: (appId: string, locationId: string) => Payments };
  }
}

const SDK_URL_SANDBOX = "https://sandbox.web.squarecdn.com/v1/square.js";
const SDK_URL_PRODUCTION = "https://web.squarecdn.com/v1/square.js";

let sdkLoadPromise: Promise<void> | null = null;

function loadSquareSdk(mode: "sandbox" | "production"): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Square) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = mode === "production" ? SDK_URL_PRODUCTION : SDK_URL_SANDBOX;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkLoadPromise = null;
      reject(new Error("Failed to load Square SDK"));
    };
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

export type SquareCardHandle = {
  tokenize: () => Promise<{ token: string } | { error: string }>;
};

export default function SquareCard({
  applicationId,
  locationId,
  mode,
  onReady,
  onError,
  registerHandle,
}: {
  applicationId: string | null;
  locationId: string | null;
  mode: "sandbox" | "production" | null;
  onReady?: () => void;
  onError?: (err: string) => void;
  registerHandle?: (handle: SquareCardHandle) => void;
}) {
  const containerId = useId().replace(/:/g, "-");
  const cardRef = useRef<Card | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unconfigured" | "error">(
    !applicationId || !locationId || !mode ? "unconfigured" : "loading"
  );

  useEffect(() => {
    if (!applicationId || !locationId || !mode) return;

    let cancelled = false;
    (async () => {
      try {
        await loadSquareSdk(mode);
        if (cancelled) return;
        const square = window.Square;
        if (!square) throw new Error("Square SDK did not load");
        const payments = square.payments(applicationId, locationId);
        const card = await payments.card();
        if (cancelled) return;
        await card.attach(`#${containerId}`);
        if (cancelled) {
          await card.destroy();
          return;
        }
        cardRef.current = card;
        setStatus("ready");
        onReady?.();

        registerHandle?.({
          tokenize: async () => {
            const result = await card.tokenize();
            if (result.status === "OK" && result.token) {
              return { token: result.token };
            }
            return {
              error: result.errors?.map((e) => e.message).join("; ") ?? "Tokenization failed",
            };
          },
        });
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        onError?.((e as Error).message);
      }
    })();

    return () => {
      cancelled = true;
      const card = cardRef.current;
      if (card) {
        card.destroy().catch(() => {});
        cardRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, locationId, mode]);

  if (status === "unconfigured") {
    return (
      <div className="p-4 bg-romolo-cream border border-romolo-border rounded-sm text-sm text-romolo-charcoal">
        Online ordering is being set up. Call us at{" "}
        <a href="tel:+16505740625" className="text-romolo-red underline font-semibold">
          (650) 574-0625
        </a>{" "}
        to place an order.
      </div>
    );
  }

  return (
    <div>
      <div
        id={containerId}
        className="min-h-[60px] p-3 bg-white border border-romolo-border rounded-sm"
      />
      {status === "loading" && (
        <p className="text-xs text-romolo-warm-gray mt-2 italic">Loading secure card form…</p>
      )}
      {status === "error" && (
        <p className="text-xs text-romolo-red mt-2">
          Card form failed to load. Refresh and try again, or call (650) 574-0625.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/SquareCard.tsx
git commit -m "Add SquareCard component wrapping Web Payments SDK"
```

---

## Task 20: Replace fake card UI in StepPay + wire submission flow

**Files:**
- Modify: `src/components/OrderFlow.tsx`

- [ ] **Step 1: Add public Square config helper for client use**

At the top of `src/components/OrderFlow.tsx`, add new imports and a helper:

```tsx
import SquareCard, { type SquareCardHandle } from "./SquareCard";
import { useRef } from "react";
```

(Add `useRef` to the existing `react` import line if already present.)

Below the existing imports, add:

```tsx
const PUBLIC_SQUARE = {
  applicationId: process.env.NEXT_PUBLIC_SQUARE_APP_ID || null,
  locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || null,
  mode: (process.env.NEXT_PUBLIC_SQUARE_ENV || null) as "sandbox" | "production" | null,
};

const idempotencyKey = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
```

- [ ] **Step 2: Add submission state to top-level `OrderFlow` component**

Inside `OrderFlow`, after `const [order, setOrder] = useState<Order>(initialOrder);` add:

```tsx
const cardRef = useRef<SquareCardHandle | null>(null);
const [submitting, setSubmitting] = useState(false);
const [submitError, setSubmitError] = useState<{
  code: string;
  message: string;
} | null>(null);
const idempotencyKeyRef = useRef<string>(idempotencyKey());
```

In the `useEffect` that resets state when `isOpen` flips, add:

```tsx
setSubmitError(null);
idempotencyKeyRef.current = idempotencyKey();
```

- [ ] **Step 3: Build the submission function**

Inside `OrderFlow`, before the `return` statement, add:

```tsx
const flavorNames = Object.fromEntries(flavors.map((f) => [f.id, f.name]));

async function submitOrder() {
  if (!cardRef.current) {
    setSubmitError({ code: "VALIDATION", message: "Card form not ready." });
    return;
  }
  setSubmitting(true);
  setSubmitError(null);

  try {
    const tokenRes = await cardRef.current.tokenize();
    if ("error" in tokenRes) {
      setSubmitError({ code: "VALIDATION", message: tokenRes.error });
      setSubmitting(false);
      return;
    }

    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date: order.date,
        time: order.time,
        lines: order.lines,
        fulfillment: order.fulfillment,
        zone: order.zone
          ? { id: order.zone.id, label: order.zone.label, fee: order.zone.fee, auto: order.zone.auto }
          : null,
        address: order.address,
        deliveryNotes: order.deliveryNotes,
        contact: order.contact,
        idempotencyKey: idempotencyKeyRef.current,
        flavorNames,
      }),
    });

    if (!orderRes.ok) {
      const body = await orderRes.json().catch(() => ({}));
      setSubmitError(body.error ?? { code: "SQUARE_UNAVAILABLE", message: "Order failed." });
      setSubmitting(false);
      return;
    }

    const created = (await orderRes.json()) as {
      orderId: string;
      totals: { total: number };
    };

    const payRes = await fetch("/api/orders/pay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orderId: created.orderId,
        sourceId: tokenRes.token,
        idempotencyKey: idempotencyKeyRef.current + "-pay",
        amountCents: String(Math.round(created.totals.total * 100)),
      }),
    });

    if (!payRes.ok) {
      const body = await payRes.json().catch(() => ({}));
      setSubmitError(body.error ?? { code: "SQUARE_UNAVAILABLE", message: "Payment failed." });
      setSubmitting(false);
      return;
    }

    const paid = (await payRes.json()) as { confirmation: string };
    setOrder({ ...order, confirmation: paid.confirmation });
    setStep(4);
  } catch (e) {
    setSubmitError({ code: "SQUARE_UNAVAILABLE", message: (e as Error).message });
  } finally {
    setSubmitting(false);
  }
}
```

- [ ] **Step 4: Wire the "Place order" button**

Find the Place order button (currently `onClick={() => { if (step === 3) { setStep(4); } else { next(); } }}`). Replace with:

```tsx
onClick={() => {
  if (step === 3) {
    submitOrder();
  } else {
    next();
  }
}}
disabled={!canAdvance || submitting}
```

Update the button label conditional from `step === 3 ? "Place order" : "Continue"` to:

```tsx
{step === 3 ? (submitting ? "Placing…" : "Place order") : "Continue"}
```

- [ ] **Step 5: Pass `cardRef`, `submitError`, and `setSubmitError` into `StepPay`**

Find the line `{step === 3 && <StepPay order={order} setOrder={setOrder} />}` and replace with:

```tsx
{step === 3 && (
  <StepPay
    order={order}
    setOrder={setOrder}
    registerCardHandle={(h) => (cardRef.current = h)}
    submitError={submitError}
    onClearError={() => setSubmitError(null)}
  />
)}
```

- [ ] **Step 6: Rewrite `StepPay`**

Replace the entire `StepPay` function (currently approximately lines 886–962) with:

```tsx
function StepPay({
  order,
  setOrder,
  registerCardHandle,
  submitError,
  onClearError,
}: {
  order: Order;
  setOrder: (o: Order) => void;
  registerCardHandle: (h: SquareCardHandle) => void;
  submitError: { code: string; message: string } | null;
  onClearError: () => void;
}) {
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
      <SquareCard
        applicationId={PUBLIC_SQUARE.applicationId}
        locationId={PUBLIC_SQUARE.locationId}
        mode={PUBLIC_SQUARE.mode}
        registerHandle={registerCardHandle}
      />

      {submitError && <ErrorBanner error={submitError} onDismiss={onClearError} />}

      <label className="text-xs text-romolo-warm-gray flex gap-2 items-center mt-4">
        <input
          type="checkbox"
          checked={order.cardOk}
          onChange={(e) => setOrder({ ...order, cardOk: e.target.checked })}
        />
        I agree to the order details above.
      </label>
    </div>
  );
}

function ErrorBanner({
  error,
  onDismiss,
}: {
  error: { code: string; message: string };
  onDismiss: () => void;
}) {
  const isYellow = error.code === "ITEM_OUT_OF_STOCK" || error.code === "PRICE_CHANGED";
  const tone = isYellow
    ? { bg: "#fff8ed", border: "#f0d8a8", color: "#8a5a18" }
    : { bg: "#fef0ef", border: "#f5b8b3", color: "#8c1f17" };
  const friendly =
    error.code === "CARD_DECLINED"
      ? "Card was declined. Try a different card."
      : error.code === "SQUARE_NOT_CONFIGURED"
      ? "Online payments aren't connected yet. Call (650) 574-0625 to place your order."
      : error.code === "SQUARE_UNAVAILABLE"
      ? "Payments are temporarily down. Call (650) 574-0625 — we'll take your order over the phone."
      : error.message;
  return (
    <div
      className="mt-4 px-4 py-3 rounded-sm border text-sm flex items-start gap-3"
      style={{ background: tone.bg, borderColor: tone.border, color: tone.color }}
    >
      <span className="flex-1">{friendly}</span>
      <button onClick={onDismiss} className="text-xs uppercase tracking-[0.1em] font-bold">
        ✕
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Verify TypeScript compiles + dev server boots**

Run: `npx tsc --noEmit`
Expected: No errors.

Run: `npm run dev`
Visit `http://localhost:3000`. Open the order flow modal, walk through to step 4 (Pay). Expected: degraded-mode banner appears in place of card form (env vars not set locally). Place order button stays disabled. Rest of the flow walkable.
Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add src/components/OrderFlow.tsx
git commit -m "Wire OrderFlow to Square API with degraded-mode card form"
```

---

## Task 21: Sandbox runbook documentation

**Files:**
- Create: `docs/square-setup.md`

- [ ] **Step 1: Write runbook**

```markdown
# Square Setup Runbook

How to connect Square credentials once they're available. Spec: `docs/square-integration-design.md`.

## 1. Create a sandbox application

1. Sign in at `developer.squareup.com`.
2. Create a new application (call it `Romolo Web — Sandbox`).
3. Open the **Sandbox** tab. Note the values:
   - **Application ID** (starts with `sandbox-sq0idb-…`)
   - **Access Token** (starts with `EAAAl…`)
   - **Default Test Account → Location ID**

## 2. Set Railway env vars (production env)

Open the Railway dashboard for the `romolo` project, `production` environment. Set:

| Variable | Value |
|---|---|
| `SQUARE_ACCESS_TOKEN` | the sandbox access token |
| `SQUARE_LOCATION_ID` | the sandbox location ID |
| `NEXT_PUBLIC_SQUARE_APP_ID` | the sandbox application ID |

`SQUARE_ENV`, `NEXT_PUBLIC_SQUARE_ENV`, and `NEXT_PUBLIC_SQUARE_LOCATION_ID` (a reference) are already set.

`SQUARE_WEBHOOK_SIGNATURE_KEY` will be set in step 4.

(If you want a separate staging env, create one in Railway and put the sandbox values there instead. Then production keeps real-money creds.)

## 3. Catalog mapping pass

Without this step, the `/api/orders` endpoint returns `503 SQUARE_NOT_CONFIGURED` on every request because `mappers.ts` is a stub.

1. In the Square dashboard → Items, list every variation. Note each variation's ID (visible in the URL when editing, or via the catalog API).
2. For each item in `src/lib/data.ts` `MENU_DATA`, fill in:
   - `squareItemId` — the parent ITEM ID
   - `squareVariationId` — the specific variation ID with the price
   - `trackStock: true` — only if you want sold-out UI for that item
3. For each flavor in `INITIAL_FLAVORS` that you want to track stock for, fill in `squareVariationId`.
4. Open `src/lib/square/mappers.ts`. Replace the bodies of `squareLineItemsForOrderLine` and `applyStockEvent` with real logic against the live catalog. The current stubs document what they need to produce. Use the test fixtures in `src/lib/square/__fixtures__/` as reference.
5. Add unit tests for the new mapper logic (mirror the structure in `mappers.test.ts`).
6. Run `npm test` — everything green.

## 4. Webhook subscription

1. Square Developer Dashboard → your application → **Webhooks** → **Subscriptions** → **Add subscription**.
2. URL: `https://romolo-production.up.railway.app/api/webhooks/square`
3. Events:
   - `inventory.count.updated`
   - `payment.updated`
   - `order.updated`
4. After saving, Square shows a **Signature Key** — copy it into Railway as `SQUARE_WEBHOOK_SIGNATURE_KEY`.

## 5. Enable per-variation stock tracking

In the Square dashboard, for every item where you want sold-out UI:
- Edit the item → variation → **Track stock** = on.
- Set an initial count.

Otherwise the webhook never fires for that variation and the cache stays empty.

## 6. Smoke-test the connection

```bash
npm run test:sandbox
```

(Implement this opt-in suite in `src/lib/square/__sandbox__/` if you want automated coverage. Optional — manual testing is fine for v1.)

Then walk a real order through the deployed site:
1. Visit `https://romolo-production.up.railway.app`.
2. Open the order flow.
3. Use Square test card `4111 1111 1111 1111`, any future expiry, any CVC, any ZIP.
4. Place the order. You should land on the confirmation step with a real Square `confirmation` ID.
5. Open Square Dashboard → Orders. The order appears with line items and the kitchen-readable filling note.

## 7. Decline test

Use card `4000 0000 0000 0002`. The `StepPay` should render the red `CARD_DECLINED` banner, no order is created in Square.

## 8. Out-of-stock test

Manually set a tracked variation's count to 0 in Square. Wait for the webhook (or refresh the menu after ~60s). The item should render with the "Sold out today" overlay and disappear from the order-flow item dropdown.

## 9. Going to production

Only after sandbox passes end-to-end:

1. Create a **Production** application at `developer.squareup.com` (or use the Production tab of the existing app).
2. Replace all four secrets in Railway with production values:
   - `SQUARE_ACCESS_TOKEN`
   - `SQUARE_LOCATION_ID`
   - `NEXT_PUBLIC_SQUARE_APP_ID`
   - `SQUARE_WEBHOOK_SIGNATURE_KEY` (recreate the webhook subscription against the production endpoint and copy the new signature key)
3. Flip `SQUARE_ENV=production` and `NEXT_PUBLIC_SQUARE_ENV=production` in Railway.
4. Redeploy.
5. Place one real order with your own card to confirm the live wiring. Refund yourself in the Square dashboard.
```

- [ ] **Step 2: Commit**

```bash
git add docs/square-setup.md
git commit -m "Add runbook for connecting Square credentials"
```

---

## Task 22: Final verification

**Files:** none

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass — env, client, stockCache, mappers, catalog, orders, payments, webhooks, menu, /api/orders, /api/orders/pay, /api/webhooks/square.

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Run linter**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 4: Walk the site in dev**

Run: `npm run dev`
Manually verify:
- Home page renders identically to before.
- Menu cards look unchanged (no items have `trackStock=true` yet).
- Order flow modal opens, walks through step 1 → 4.
- StepPay shows the degraded-mode banner ("Online ordering is being set up…") instead of the card form.
- "Place order" button is disabled.

Stop the dev server.

- [ ] **Step 5: Build for production**

Run: `npm run build`
Expected: Build succeeds with no errors. Note: API routes for Square will be present but not exercised since env vars aren't set.

- [ ] **Step 6: Optional — push to Railway and verify deploy**

Run: `git push origin main`
Wait for Railway to deploy. Visit `https://romolo-production.up.railway.app`. Expected: site looks identical, degraded-mode banner shows on StepPay.

The app is now ready for credentials. Follow `docs/square-setup.md` when access arrives.
