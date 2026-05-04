# Square Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing 4-step "Start an Order" modal on romolocannoli.com to live Square Sandbox catalog and real Square Web Payments, pickup-only, with Cannoli filtered out until later.

**Architecture:** Next.js 16 Server Component fetches a `MenuSnapshot` (catalog + inventory + business hours) from Square Sandbox, cached 15 min via `revalidate: 900`, and passes it through `OrderProvider` to a client-rendered modal. The modal's "What" step renders generic Variation/Modifier pickers from snapshot data; the "Pay" step mounts Square Web Payments SDK and submits to a Next.js API route that calls `Orders.createOrder` + `Payments.createPayment`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind v4, Square Node.js SDK (`square` v38+), Square Web Payments SDK (script tag), Zod (request validation), Vitest (unit tests for pure logic).

**Spec:** `docs/superpowers/specs/2026-05-03-square-integration-design.md`

---

## File Layout (locked)

**Created:**
- `src/lib/square/client.ts` — server-only Square SDK singleton
- `src/lib/square/types.ts` — domain types (`MenuSnapshot`, etc.)
- `src/lib/square/serializers.ts` — pure shape mappers (Square → snapshot)
- `src/lib/square/serializers.test.ts` — unit tests
- `src/lib/square/catalog.ts` — `getMenuSnapshot()`
- `src/lib/square/hours.ts` — `getOpenPeriods()` + `slotsForDate()`
- `src/lib/square/hours.test.ts` — unit tests
- `src/lib/square/orders.ts` — `buildOrderPayload()` + `createOrderAndPayment()`
- `src/lib/square/orders.test.ts` — unit tests for builder
- `src/app/api/orders/route.ts` — `POST` handler
- `src/app/api/health/route.ts` — `GET` sanity check
- `src/components/order/VariationPicker.tsx`
- `src/components/order/ModifierSet.tsx`
- `src/components/order/SquareCard.tsx`
- `vitest.config.ts`

**Modified:**
- `src/app/page.tsx` — Server Component that fetches snapshot
- `src/app/layout.tsx` — adds Square Web Payments SDK `<script>`
- `src/components/OrderProvider.tsx` — accepts `initialSnapshot`, exposes `snapshot`
- `src/components/OrderFlow.tsx` — Steps 1/2/3/4/5 reworked
- `src/lib/data.ts` — comment marking Cannoli scaffolding as out-of-scope
- `package.json` — add deps
- `README.md` — Railway env var setup section

---

## Task 1: Install dependencies and set up Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1.1: Install runtime + dev dependencies**

Run:
```bash
npm install square zod
npm install --save-dev vitest @vitest/ui
```

Expected: `package.json` gets `square` and `zod` under `dependencies`; `vitest` and `@vitest/ui` under `devDependencies`. No errors.

- [ ] **Step 1.2: Create `vitest.config.ts`**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 1.3: Add `test` script to `package.json`**

In `package.json`, add to `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

The full `scripts` block becomes:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 1.4: Verify Vitest runs (no tests yet)**

Run: `npm test`
Expected: `No test files found` exits with non-zero — that's fine for now. Confirms Vitest is wired.

- [ ] **Step 1.5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "Add square, zod, vitest deps and config"
```

---

## Task 2: Domain types

**Files:**
- Create: `src/lib/square/types.ts`

- [ ] **Step 2.1: Write the types file**

Create `src/lib/square/types.ts`:

```ts
export type MenuSnapshot = {
  fetchedAt: string;
  locationId: string;
  currency: "USD";
  items: SnapshotItem[];
  hours: OpenPeriods;
};

export type SnapshotItem = {
  id: string;
  name: string;
  description?: string;
  categoryName?: string;
  variations: SnapshotVariation[];
  modifierLists: SnapshotModifierList[];
};

export type SnapshotVariation = {
  id: string;
  name: string;
  priceCents: number;
  inStock: boolean;
  pickupEnabled: boolean;
};

export type SnapshotModifierList = {
  id: string;
  name: string;
  selectionType: "SINGLE" | "MULTIPLE";
  minSelected: number;
  maxSelected: number | null;
  modifiers: SnapshotModifier[];
};

export type SnapshotModifier = {
  id: string;
  name: string;
  priceCents: number;
};

export type OpenPeriods = {
  byWeekday: Record<number, Array<{ openLocal: string; closeLocal: string }>>;
  timezone: string;
};

export type OrderResult =
  | { status: "ok"; orderId: string; confirmation: string }
  | { status: "out_of_stock"; itemNames: string[] }
  | { status: "card_declined"; message: string }
  | { status: "invalid_payload"; field: string; message: string }
  | { status: "square_error"; code: string; message: string };

export type OrderRequest = {
  idempotencyKey: string;
  sourceId: string;
  pickupAt: string;
  contact: { name: string; phone: string; email: string };
  lines: Array<{
    catalogObjectId: string;
    quantity: number;
    modifiers: string[];
  }>;
};
```

- [ ] **Step 2.2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2.3: Commit**

```bash
git add src/lib/square/types.ts
git commit -m "Add Square integration domain types"
```

---

## Task 3: Square SDK client (server-only singleton)

**Files:**
- Create: `src/lib/square/client.ts`

- [ ] **Step 3.1: Write the client file**

Create `src/lib/square/client.ts`:

```ts
import "server-only";
import { SquareClient } from "square";

let cached: SquareClient | null = null;

export function squareClient(): SquareClient {
  if (cached) return cached;
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "SQUARE_ACCESS_TOKEN is not set. Configure it in Railway env vars (or in your shell for local dev)."
    );
  }
  cached = new SquareClient({ token });
  return cached;
}

export function squareLocationId(): string {
  const id = process.env.SQUARE_LOCATION_ID;
  if (!id) {
    throw new Error("SQUARE_LOCATION_ID is not set.");
  }
  return id;
}
```

> Note: Modern Square SDK (v38+) does not require an `environment` parameter — sandbox vs production is determined by the access token itself. The client-side Web Payments SDK still needs `NEXT_PUBLIC_SQUARE_ENVIRONMENT` to pick the correct CDN URL (handled in Task 11).

- [ ] **Step 3.2: Install `server-only` if not transitively present**

Run: `npm ls server-only`

If absent, run: `npm install server-only`

- [ ] **Step 3.3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3.4: Commit**

```bash
git add src/lib/square/client.ts package.json package-lock.json
git commit -m "Add Square SDK client singleton"
```

---

## Task 4: Serializers — pure shape mappers (TDD)

**Files:**
- Create: `src/lib/square/serializers.ts`
- Create: `src/lib/square/serializers.test.ts`

- [ ] **Step 4.1: Write failing tests**

Create `src/lib/square/serializers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  serializeItem,
  serializeModifierList,
  isCannoliCategory,
} from "./serializers";

describe("isCannoliCategory", () => {
  it("returns true for category names containing Cannoli (any case)", () => {
    expect(isCannoliCategory("Cannoli")).toBe(true);
    expect(isCannoliCategory("cannoli")).toBe(true);
    expect(isCannoliCategory("Cannoli Online")).toBe(true);
  });

  it("returns false for unrelated categories", () => {
    expect(isCannoliCategory("Ice Cream")).toBe(false);
    expect(isCannoliCategory("Cookie")).toBe(false);
    expect(isCannoliCategory(undefined)).toBe(false);
  });
});

describe("serializeModifierList", () => {
  it("maps a SINGLE-select Square modifier list", () => {
    const result = serializeModifierList(
      {
        type: "MODIFIER_LIST",
        id: "ML1",
        modifierListData: {
          name: "Cookie Flavors",
          selectionType: "SINGLE",
          modifiers: [
            {
              type: "MODIFIER",
              id: "M1",
              modifierData: {
                name: "Amaretti",
                priceMoney: { amount: BigInt(0), currency: "USD" },
              },
            },
          ],
        },
      } as any
    );

    expect(result).toEqual({
      id: "ML1",
      name: "Cookie Flavors",
      selectionType: "SINGLE",
      minSelected: 1,
      maxSelected: 1,
      modifiers: [{ id: "M1", name: "Amaretti", priceCents: 0 }],
    });
  });

  it("maps a MULTIPLE-select list with a price upcharge", () => {
    const result = serializeModifierList(
      {
        type: "MODIFIER_LIST",
        id: "ML2",
        modifierListData: {
          name: "Toppings",
          selectionType: "MULTIPLE",
          modifiers: [
            {
              type: "MODIFIER",
              id: "M2",
              modifierData: {
                name: "Pistachio",
                priceMoney: { amount: BigInt(50), currency: "USD" },
              },
            },
          ],
        },
      } as any
    );

    expect(result.selectionType).toBe("MULTIPLE");
    expect(result.minSelected).toBe(0);
    expect(result.maxSelected).toBe(null);
    expect(result.modifiers[0].priceCents).toBe(50);
  });
});

describe("serializeItem", () => {
  const baseItem = {
    type: "ITEM",
    id: "I1",
    itemData: {
      name: "Cookies",
      description: "Box of assorted",
      variations: [
        {
          type: "ITEM_VARIATION",
          id: "V1",
          itemVariationData: {
            name: "Regular",
            priceMoney: { amount: BigInt(1500), currency: "USD" },
            trackInventory: false,
            locationOverrides: [
              { locationId: "L1", trackInventory: false },
            ],
          },
        },
      ],
      modifierListInfo: [{ modifierListId: "ML1", enabled: true }],
    },
  } as any;

  const modifierLists = [
    {
      id: "ML1",
      name: "Cookie Flavors",
      selectionType: "SINGLE" as const,
      minSelected: 1,
      maxSelected: 1,
      modifiers: [{ id: "M1", name: "Amaretti", priceCents: 0 }],
    },
  ];

  it("maps an item with one variation and one attached modifier list", () => {
    const result = serializeItem(baseItem, "Cookie", modifierLists, {
      // empty stock map ⇒ in stock by default for non-stockable
    });
    expect(result.id).toBe("I1");
    expect(result.name).toBe("Cookies");
    expect(result.categoryName).toBe("Cookie");
    expect(result.variations).toHaveLength(1);
    expect(result.variations[0]).toMatchObject({
      id: "V1",
      name: "Regular",
      priceCents: 1500,
      inStock: true,
    });
    expect(result.modifierLists).toHaveLength(1);
    expect(result.modifierLists[0].id).toBe("ML1");
  });

  it("marks a stockable variation out of stock when count is zero", () => {
    const stockableItem = {
      ...baseItem,
      itemData: {
        ...baseItem.itemData,
        variations: [
          {
            type: "ITEM_VARIATION",
            id: "V2",
            itemVariationData: {
              name: "Small",
              priceMoney: { amount: BigInt(500), currency: "USD" },
              trackInventory: true,
            },
          },
        ],
      },
    };
    const result = serializeItem(stockableItem, "Ice Cream", [], {
      V2: 0,
    });
    expect(result.variations[0].inStock).toBe(false);
  });

  it("marks a stockable variation in stock when count is positive", () => {
    const stockableItem = {
      ...baseItem,
      itemData: {
        ...baseItem.itemData,
        variations: [
          {
            type: "ITEM_VARIATION",
            id: "V3",
            itemVariationData: {
              name: "Pint",
              priceMoney: { amount: BigInt(1200), currency: "USD" },
              trackInventory: true,
            },
          },
        ],
      },
    };
    const result = serializeItem(stockableItem, "Ice Cream", [], {
      V3: 5,
    });
    expect(result.variations[0].inStock).toBe(true);
  });
});
```

- [ ] **Step 4.2: Run tests to confirm they fail**

Run: `npm test`
Expected: failures with `Cannot find module './serializers'`.

- [ ] **Step 4.3: Implement serializers**

Create `src/lib/square/serializers.ts`:

```ts
import type {
  SnapshotItem,
  SnapshotModifierList,
  SnapshotModifier,
  SnapshotVariation,
} from "./types";

export function isCannoliCategory(name?: string): boolean {
  if (!name) return false;
  return name.toLowerCase().includes("cannoli");
}

export function serializeModifier(raw: any): SnapshotModifier {
  const data = raw.modifierData ?? {};
  const amount = data.priceMoney?.amount;
  return {
    id: raw.id,
    name: data.name ?? "",
    priceCents: amount != null ? Number(amount) : 0,
  };
}

export function serializeModifierList(raw: any): SnapshotModifierList {
  const data = raw.modifierListData ?? {};
  const selectionType: "SINGLE" | "MULTIPLE" =
    data.selectionType === "MULTIPLE" ? "MULTIPLE" : "SINGLE";
  const minSelected = selectionType === "SINGLE" ? 1 : 0;
  const maxSelected = selectionType === "SINGLE" ? 1 : null;

  return {
    id: raw.id,
    name: data.name ?? "",
    selectionType,
    minSelected,
    maxSelected,
    modifiers: (data.modifiers ?? []).map(serializeModifier),
  };
}

export function serializeVariation(
  raw: any,
  stockByVariationId: Record<string, number>
): SnapshotVariation {
  const data = raw.itemVariationData ?? {};
  const amount = data.priceMoney?.amount;
  const trackInventory =
    data.trackInventory === true ||
    (Array.isArray(data.locationOverrides) &&
      data.locationOverrides.some((o: any) => o.trackInventory === true));

  let inStock = true;
  if (trackInventory) {
    const count = stockByVariationId[raw.id];
    inStock = count != null && count > 0;
  }

  return {
    id: raw.id,
    name: data.name ?? "",
    priceCents: amount != null ? Number(amount) : 0,
    inStock,
    pickupEnabled: true, // Square SDK doesn't expose per-variation pickup; gate at item level upstream
  };
}

export function serializeItem(
  raw: any,
  categoryName: string | undefined,
  allModifierLists: SnapshotModifierList[],
  stockByVariationId: Record<string, number>
): SnapshotItem {
  const data = raw.itemData ?? {};
  const attachedListIds: string[] = (data.modifierListInfo ?? [])
    .filter((info: any) => info.enabled !== false)
    .map((info: any) => info.modifierListId);

  const modifierLists = allModifierLists.filter((ml) =>
    attachedListIds.includes(ml.id)
  );

  return {
    id: raw.id,
    name: data.name ?? "",
    description: data.description,
    categoryName,
    variations: (data.variations ?? []).map((v: any) =>
      serializeVariation(v, stockByVariationId)
    ),
    modifierLists,
  };
}
```

- [ ] **Step 4.4: Run tests to confirm they pass**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/lib/square/serializers.ts src/lib/square/serializers.test.ts
git commit -m "Add serializers mapping Square shapes to snapshot types"
```

---

## Task 5: getMenuSnapshot — fetch + shape catalog and inventory

**Files:**
- Create: `src/lib/square/catalog.ts`

- [ ] **Step 5.1: Write the catalog fetcher**

Create `src/lib/square/catalog.ts`:

```ts
import "server-only";
import { squareClient, squareLocationId } from "./client";
import {
  isCannoliCategory,
  serializeItem,
  serializeModifierList,
} from "./serializers";
import type { MenuSnapshot, SnapshotItem, OpenPeriods } from "./types";

export async function getCatalog(): Promise<{
  items: SnapshotItem[];
}> {
  const client = squareClient();
  const locationId = squareLocationId();

  const search = await client.catalog.search({
    objectTypes: ["ITEM", "CATEGORY"],
    includeRelatedObjects: true,
  });

  const objects = search.objects ?? [];
  const related = search.relatedObjects ?? [];

  const allObjects = [...objects, ...related];
  const categoriesById = new Map<string, string>();
  for (const o of allObjects) {
    if (o.type === "CATEGORY") {
      categoriesById.set(o.id!, (o as any).categoryData?.name ?? "");
    }
  }

  const modifierListsRaw = allObjects.filter(
    (o) => o.type === "MODIFIER_LIST"
  );
  const allModifierLists = modifierListsRaw.map(serializeModifierList);

  const itemObjects = objects.filter((o) => o.type === "ITEM");

  const variationIds = itemObjects.flatMap(
    (i: any) =>
      (i.itemData?.variations ?? []).map((v: any) => v.id) as string[]
  );

  let stockByVariationId: Record<string, number> = {};
  if (variationIds.length > 0) {
    const counts = await client.inventory.batchGetCounts({
      catalogObjectIds: variationIds,
      locationIds: [locationId],
    });
    for (const c of counts.counts ?? []) {
      if (c.catalogObjectId && c.quantity != null) {
        stockByVariationId[c.catalogObjectId] = Number(c.quantity);
      }
    }
  }

  const items: SnapshotItem[] = [];
  for (const raw of itemObjects) {
    const data = (raw as any).itemData ?? {};
    const categoryId: string | undefined =
      data.categoryId ?? data.categories?.[0]?.id;
    const categoryName = categoryId
      ? categoriesById.get(categoryId)
      : undefined;

    if (isCannoliCategory(categoryName)) continue; // out of scope

    items.push(
      serializeItem(raw, categoryName, allModifierLists, stockByVariationId)
    );
  }

  return { items };
}

export async function getMenuSnapshot(
  hours: OpenPeriods
): Promise<MenuSnapshot> {
  const { items } = await getCatalog();
  return {
    fetchedAt: new Date().toISOString(),
    locationId: squareLocationId(),
    currency: "USD",
    items,
    hours,
  };
}
```

- [ ] **Step 5.2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors. If type errors surface from the Square SDK, narrow types with `as any` only on Square SDK access points (the `(raw as any).itemData` style is acceptable here — these are external types we don't own).

- [ ] **Step 5.3: Commit**

```bash
git add src/lib/square/catalog.ts
git commit -m "Add getMenuSnapshot to fetch and shape Square catalog + inventory"
```

---

## Task 6: Hours — getOpenPeriods + slotsForDate (TDD)

**Files:**
- Create: `src/lib/square/hours.ts`
- Create: `src/lib/square/hours.test.ts`

- [ ] **Step 6.1: Write failing tests**

Create `src/lib/square/hours.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { serializeBusinessHours, slotsForDate } from "./hours";

describe("serializeBusinessHours", () => {
  it("maps Square business_hours periods to byWeekday with weekday numbers", () => {
    const result = serializeBusinessHours(
      {
        periods: [
          { dayOfWeek: "SUN", startLocalTime: "12:00:00", endLocalTime: "16:00:00" },
          { dayOfWeek: "TUE", startLocalTime: "11:00:00", endLocalTime: "18:00:00" },
        ],
      },
      "America/Los_Angeles"
    );

    expect(result.timezone).toBe("America/Los_Angeles");
    expect(result.byWeekday[0]).toEqual([
      { openLocal: "12:00", closeLocal: "16:00" },
    ]);
    expect(result.byWeekday[2]).toEqual([
      { openLocal: "11:00", closeLocal: "18:00" },
    ]);
    expect(result.byWeekday[1]).toEqual([]); // Monday: closed
  });

  it("merges multiple periods on the same day", () => {
    const result = serializeBusinessHours(
      {
        periods: [
          { dayOfWeek: "FRI", startLocalTime: "11:00:00", endLocalTime: "14:00:00" },
          { dayOfWeek: "FRI", startLocalTime: "17:00:00", endLocalTime: "21:00:00" },
        ],
      },
      "America/Los_Angeles"
    );
    expect(result.byWeekday[5]).toHaveLength(2);
  });
});

describe("slotsForDate", () => {
  const periods = {
    byWeekday: {
      0: [],
      1: [],
      2: [{ openLocal: "11:00", closeLocal: "13:00" }],
      3: [],
      4: [],
      5: [],
      6: [],
    },
    timezone: "America/Los_Angeles",
  };

  it("generates 30-minute slots within open periods", () => {
    // Tuesday 2026-05-05
    const slots = slotsForDate("2026-05-05", periods);
    expect(slots).toEqual(["11:00", "11:30", "12:00", "12:30"]);
  });

  it("returns empty for closed days", () => {
    expect(slotsForDate("2026-05-04", periods)).toEqual([]); // Monday
  });
});
```

- [ ] **Step 6.2: Run tests to confirm they fail**

Run: `npm test`
Expected: failures with `Cannot find module './hours'`.

- [ ] **Step 6.3: Implement hours**

Create `src/lib/square/hours.ts`:

```ts
import "server-only";
import { squareClient, squareLocationId } from "./client";
import type { OpenPeriods } from "./types";

const DAY_TO_WEEKDAY: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

function trimSeconds(t: string): string {
  // "11:00:00" -> "11:00"
  return t.length >= 5 ? t.slice(0, 5) : t;
}

export function serializeBusinessHours(
  raw: { periods?: Array<{ dayOfWeek?: string; startLocalTime?: string; endLocalTime?: string }> } | undefined,
  timezone: string
): OpenPeriods {
  const byWeekday: Record<number, Array<{ openLocal: string; closeLocal: string }>> = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
  };
  for (const p of raw?.periods ?? []) {
    if (!p.dayOfWeek || !p.startLocalTime || !p.endLocalTime) continue;
    const wd = DAY_TO_WEEKDAY[p.dayOfWeek];
    if (wd == null) continue;
    byWeekday[wd].push({
      openLocal: trimSeconds(p.startLocalTime),
      closeLocal: trimSeconds(p.endLocalTime),
    });
  }
  return { byWeekday, timezone };
}

export async function getOpenPeriods(): Promise<OpenPeriods> {
  const client = squareClient();
  const locationId = squareLocationId();
  const { location } = await client.locations.get({ locationId });
  return serializeBusinessHours(
    (location as any)?.businessHours,
    (location as any)?.timezone ?? "America/Los_Angeles"
  );
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function slotsForDate(dateIso: string, periods: OpenPeriods): string[] {
  // dateIso = "YYYY-MM-DD". Compute weekday in the location's timezone.
  // For simplicity (no Intl date math), parse date as YYYY-MM-DD treated as a
  // local calendar date — Square business_hours are local to the shop.
  const [y, m, d] = dateIso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = date.getUTCDay();
  const dayPeriods = periods.byWeekday[weekday] ?? [];
  const slots: string[] = [];
  for (const p of dayPeriods) {
    const start = timeToMinutes(p.openLocal);
    const end = timeToMinutes(p.closeLocal);
    for (let t = start; t + 30 <= end; t += 30) {
      slots.push(minutesToTime(t));
    }
  }
  return slots;
}
```

- [ ] **Step 6.4: Run tests to confirm they pass**

Run: `npm test`
Expected: all tests in `hours.test.ts` and `serializers.test.ts` pass.

- [ ] **Step 6.5: Commit**

```bash
git add src/lib/square/hours.ts src/lib/square/hours.test.ts
git commit -m "Add Square business hours fetcher and slot generator"
```

---

## Task 7: GET /api/health route — sanity check before wiring UI

**Files:**
- Create: `src/app/api/health/route.ts`

- [ ] **Step 7.1: Write the route**

Create `src/app/api/health/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/square/catalog";
import { getOpenPeriods } from "@/lib/square/hours";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [{ items }, hours] = await Promise.all([
      getCatalog(),
      getOpenPeriods(),
    ]);
    return NextResponse.json({
      ok: true,
      catalogItems: items.length,
      itemNames: items.map((i) => i.name),
      openDays: Object.entries(hours.byWeekday)
        .filter(([, periods]) => periods.length > 0)
        .map(([wd]) => Number(wd)),
      timezone: hours.timezone,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 7.2: Set Railway env vars (manual, before testing)**

Run via Railway CLI (replace values with your sandbox credentials from https://developer.squareup.com/apps):

```bash
railway variables --set SQUARE_ACCESS_TOKEN=EAAAExxxxxxxxxxxxxxxxxx
railway variables --set SQUARE_LOCATION_ID=Lxxxxxxxxxxx
railway variables --set NEXT_PUBLIC_SQUARE_APPLICATION_ID=sandbox-sq0idb-xxxxxxxx
railway variables --set NEXT_PUBLIC_SQUARE_LOCATION_ID=Lxxxxxxxxxxx
railway variables --set NEXT_PUBLIC_SQUARE_ENVIRONMENT=sandbox
```

(Sandbox uses the SAME `SquareClient` initialization as production — only the access token differs, since modern SDK reads the env from the token itself.)

> Before running this, seed your Square Sandbox dashboard with the in-scope catalog items (Cookies with a Cookie Flavors modifier list, Ice Cream with multiple variations, Tiramisu with 2 variations, Chocolate Banana, Milkshake, Spumoni Wedge, Tartufi). Set business hours under the Sandbox location.

- [ ] **Step 7.3: Deploy to Railway and test the health endpoint**

Run: `git push` (Railway auto-deploys on push to main per existing setup).

Once deployed, in a browser or via `curl`:

```bash
curl https://<your-railway-url>/api/health
```

Expected: JSON like:
```json
{
  "ok": true,
  "catalogItems": 7,
  "itemNames": ["Cookies", "Ice Cream", "Tiramisu", "Chocolate Banana", "Milkshake", "Spumoni Wedge", "Tartufi"],
  "openDays": [0, 2, 3, 4, 5, 6],
  "timezone": "America/Los_Angeles"
}
```

If `ok: false`, the error message indicates the issue (missing env var, bad token, no items in sandbox, etc.). Fix and redeploy.

- [ ] **Step 7.4: Commit**

```bash
git add src/app/api/health/route.ts
git commit -m "Add /api/health endpoint for Square sanity checks"
```

---

## Task 8: Wire snapshot into page.tsx + OrderProvider

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/OrderProvider.tsx`

- [ ] **Step 8.1: Modify `OrderProvider.tsx` to accept and expose snapshot**

Replace the contents of `src/components/OrderProvider.tsx` with:

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { INITIAL_FLAVORS, type Flavor } from "@/lib/data";
import type { MenuSnapshot } from "@/lib/square/types";

type OrderContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  flavors: Flavor[];
  setFlavors: (flavors: Flavor[]) => void;
  toggleFlavor: (id: string) => { name: string; now: boolean };
  snapshot: MenuSnapshot;
};

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({
  children,
  initialSnapshot,
}: {
  children: ReactNode;
  initialSnapshot: MenuSnapshot;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [flavors, setFlavors] = useState<Flavor[]>(INITIAL_FLAVORS);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const toggleFlavor = useCallback((id: string) => {
    let toastInfo = { name: "", now: false };
    setFlavors((prev) => {
      const next = prev.map((f) =>
        f.id === id ? { ...f, available: !f.available } : f
      );
      const updated = next.find((f) => f.id === id);
      if (updated) toastInfo = { name: updated.name, now: updated.available };
      return next;
    });
    return toastInfo;
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close,
      flavors,
      setFlavors,
      toggleFlavor,
      snapshot: initialSnapshot,
    }),
    [isOpen, open, close, flavors, toggleFlavor, initialSnapshot]
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be used within OrderProvider");
  return ctx;
}
```

- [ ] **Step 8.2: Modify `page.tsx` to be a Server Component fetching the snapshot**

Replace `src/app/page.tsx` with:

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
import { getCatalog } from "@/lib/square/catalog";
import { getOpenPeriods } from "@/lib/square/hours";
import { squareLocationId } from "@/lib/square/client";
import type { MenuSnapshot } from "@/lib/square/types";

export const revalidate = 900;

async function loadSnapshot(): Promise<MenuSnapshot> {
  const [{ items }, hours] = await Promise.all([
    getCatalog(),
    getOpenPeriods(),
  ]);
  return {
    fetchedAt: new Date().toISOString(),
    locationId: squareLocationId(),
    currency: "USD",
    items,
    hours,
  };
}

export default async function Home() {
  const snapshot = await loadSnapshot();

  return (
    <OrderProvider initialSnapshot={snapshot}>
      <ScrollAnimator />
      <Navbar />
      <main>
        <Hero />
        <Heritage />
        <Process />
        <Menu />
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

- [ ] **Step 8.3: Verify TypeScript compiles and Next dev server runs**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev` (in another terminal)
Expected: server starts, page loads at http://localhost:3000 without runtime error. (Local dev needs the env vars set in your shell, e.g. `export SQUARE_ACCESS_TOKEN=…`. If you're skipping local dev per project preference, `git push` to Railway and verify there.)

> Note: this commit makes the homepage hard-depend on Square env vars being set in any environment that builds or runs it. If a build environment lacks them, the build will fail. That's the desired behavior (fail loud).

- [ ] **Step 8.4: Commit**

```bash
git add src/app/page.tsx src/components/OrderProvider.tsx
git commit -m "Wire Square menu snapshot through OrderProvider"
```

---

## Task 9: Refactor Step 1 (When) to use snapshot.hours

**Files:**
- Modify: `src/components/OrderFlow.tsx`

- [ ] **Step 9.1: Replace `StepWhen` with snapshot-driven implementation**

In `src/components/OrderFlow.tsx`, locate the `StepWhen` function (around line 249). Replace its body with:

```tsx
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
```

- [ ] **Step 9.2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9.3: Commit**

```bash
git add src/components/OrderFlow.tsx
git commit -m "Drive Step 1 day grid and time slots from Square business hours"
```

---

## Task 10: VariationPicker component

**Files:**
- Create: `src/components/order/VariationPicker.tsx`

- [ ] **Step 10.1: Write the component**

Create `src/components/order/VariationPicker.tsx`:

```tsx
"use client";

import type { SnapshotVariation } from "@/lib/square/types";

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
```

- [ ] **Step 10.2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10.3: Commit**

```bash
git add src/components/order/VariationPicker.tsx
git commit -m "Add VariationPicker component"
```

---

## Task 11: ModifierSet component

**Files:**
- Create: `src/components/order/ModifierSet.tsx`

- [ ] **Step 11.1: Write the component**

Create `src/components/order/ModifierSet.tsx`:

```tsx
"use client";

import type { SnapshotModifierList } from "@/lib/square/types";

const fmt = (cents: number) => "$" + (cents / 100).toFixed(2);

export function ModifierSet({
  list,
  selectedIds,
  onChange,
}: {
  list: SnapshotModifierList;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const isSingle = list.selectionType === "SINGLE";

  const toggle = (id: string) => {
    if (isSingle) {
      onChange([id]);
      return;
    }
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      if (list.maxSelected != null && selectedIds.length >= list.maxSelected) {
        return;
      }
      onChange([...selectedIds, id]);
    }
  };

  const helper = isSingle
    ? "Choose one"
    : list.maxSelected != null
    ? `Up to ${list.maxSelected}`
    : "Choose any";

  return (
    <div className="mb-4">
      <h5 className="flex items-center gap-2 text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray font-medium mb-2">
        {list.name}
        <span className="font-semibold normal-case tracking-normal text-romolo-red">
          · {helper}
        </span>
      </h5>
      <div className="flex flex-wrap gap-2">
        {list.modifiers.map((m) => {
          const sel = selectedIds.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                sel
                  ? "bg-romolo-red text-white border-romolo-red"
                  : "bg-romolo-cream text-romolo-warm-gray border-romolo-border hover:border-romolo-red/40"
              }`}
            >
              {m.name}
              {m.priceCents > 0 && (
                <span className="opacity-80">+{fmt(m.priceCents)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 11.2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 11.3: Commit**

```bash
git add src/components/order/ModifierSet.tsx
git commit -m "Add ModifierSet component"
```

---

## Task 12: Refactor Step 2 (What) to use snapshot

**Files:**
- Modify: `src/components/OrderFlow.tsx`

This is the largest single change. Step 2 currently has a Cannoli-specific UI baked into `OrderLineEditor`. We replace the line model + editor with a snapshot-driven version.

- [ ] **Step 12.1: Update the `OrderLine`, `Order`, and `initialOrder` types/initializers**

In `src/components/OrderFlow.tsx`, replace the type/initializer block near the top:

```ts
type OrderLine = {
  id: string;
  itemId: string;       // SnapshotItem.id
  variationId: string;  // SnapshotVariation.id
  qty: number;
  modifiers: Record<string, string[]>; // modifierListId -> selected modifier ids
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
```

> Removed: `Address`, `FlavorMix`, `zone`, `address`, `deliveryNotes`, the cannoli-specific seed line. Cannoli scaffolding is unreachable; the user will rebuild it when wiring Cannoli.

- [ ] **Step 12.2: Update `flavorsAssigned` and `canAdvance` logic**

Replace the `flavorsAssigned` helper with snapshot-aware validation. Replace the existing `canAdvance` block in `OrderFlow` with:

```ts
const lineValid = (line: OrderLine, snapshot: MenuSnapshot): boolean => {
  const item = snapshot.items.find((i) => i.id === line.itemId);
  if (!item) return false;
  const variation = item.variations.find((v) => v.id === line.variationId);
  if (!variation || !variation.inStock) return false;
  for (const ml of item.modifierLists) {
    const sel = line.modifiers[ml.id] ?? [];
    if (sel.length < ml.minSelected) return false;
    if (ml.maxSelected != null && sel.length > ml.maxSelected) return false;
  }
  return line.qty > 0;
};

const canAdvance = (() => {
  if (step === 0) return !!order.date && !!order.time && order.timeAvailable;
  if (step === 1)
    return (
      order.lines.length > 0 &&
      order.lines.every((l) => lineValid(l, snapshot))
    );
  if (step === 2) return order.fulfillment === "pickup";
  if (step === 3) return order.cardOk && !!order.contact.email && !!order.contact.name;
  return false;
})();
```

You will also need to import `MenuSnapshot` and grab `snapshot` from `useOrder()` at the top of the `OrderFlow` component:

```tsx
const { isOpen, close, snapshot } = useOrder();
```

And remove the `flavors` parameter from `OrderFlow` (it's no longer needed for the active flow). Update `OrderFlowMount.tsx` accordingly — see Step 12.6.

- [ ] **Step 12.3: Replace `StepWhat` and `OrderLineEditor` with snapshot-driven versions**

Replace the existing `StepWhat`, `OrderLineEditor`, and `QtyStepper` block with:

```tsx
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
    const firstVariation = firstItem.variations.find((v) => v.inStock) ?? firstItem.variations[0];
    const seedModifiers: Record<string, string[]> = {};
    for (const ml of firstItem.modifierLists) {
      if (ml.selectionType === "SINGLE" && ml.modifiers[0]) {
        seedModifiers[ml.id] = [ml.modifiers[0].id];
      } else {
        seedModifiers[ml.id] = [];
      }
    }
    setOrder({
      ...order,
      lines: [
        ...order.lines,
        {
          id: lineId(),
          itemId: firstItem.id,
          variationId: firstVariation?.id ?? "",
          qty: 1,
          modifiers: seedModifiers,
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

  const onItemChange = (id: string) => {
    const next = snapshot.items.find((i) => i.id === id);
    if (!next) return;
    const firstVariation = next.variations.find((v) => v.inStock) ?? next.variations[0];
    const seedModifiers: Record<string, string[]> = {};
    for (const ml of next.modifierLists) {
      if (ml.selectionType === "SINGLE" && ml.modifiers[0]) {
        seedModifiers[ml.id] = [ml.modifiers[0].id];
      } else {
        seedModifiers[ml.id] = [];
      }
    }
    onChange({
      itemId: id,
      variationId: firstVariation?.id ?? "",
      qty: 1,
      modifiers: seedModifiers,
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
          <QtyStepper
            qty={line.qty}
            step={1}
            min={1}
            onChange={(v) => onChange({ qty: v })}
          />
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

      {item.variations.length > 1 && (
        <VariationPicker
          variations={item.variations}
          selectedId={line.variationId}
          onSelect={(id) => onChange({ variationId: id })}
        />
      )}

      {item.modifierLists.map((ml) => (
        <ModifierSet
          key={ml.id}
          list={ml}
          selectedIds={line.modifiers[ml.id] ?? []}
          onChange={(ids) =>
            onChange({ modifiers: { ...line.modifiers, [ml.id]: ids } })
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
```

- [ ] **Step 12.4: Update imports at top of `OrderFlow.tsx`**

Replace the existing import block at the top of the file with:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useOrder } from "./OrderProvider";
import { VariationPicker } from "./order/VariationPicker";
import { ModifierSet } from "./order/ModifierSet";
import type { MenuSnapshot } from "@/lib/square/types";

type Contact = { name: string; phone: string; email: string };
```

Remove the `import { DELIVERY_ZONES, MENU_DATA, fmt, type DeliveryZone, type Flavor }` line — none of those are used in the active flow anymore.

> Add a top-of-file comment block preserving the cannoli scaffold note:
> ```tsx
> // NOTE: This file previously contained Cannoli-specific UI (flavor mix, kit shells,
> // "you decide", delivery zones, Sunday surcharge). That code has been removed in
> // favor of generic Square-driven rendering. When wiring Cannoli back in, restore
> // those flows from git history (commit predating Square integration) — they will
> // need to be re-shaped against snapshot.modifierLists for "Cannoli Filling",
> // "Cannoli Toppings", etc.
> ```

- [ ] **Step 12.5: Remove unused functions**

Delete the now-unused functions from the file:
- `flavorsAssigned`
- `DeliveryConfig`
- `FulfillmentCard`
- The original `StepHow` (will be rebuilt in Task 13)
- The original `OrderSummary` (will be rebuilt in Task 14 with snapshot-driven pricing)

- [ ] **Step 12.6: Update `OrderFlowMount.tsx`**

Replace `src/components/OrderFlowMount.tsx` with:

```tsx
"use client";

import OrderFlow from "./OrderFlow";

export default function OrderFlowMount() {
  return <OrderFlow />;
}
```

And update the `OrderFlow` signature in `OrderFlow.tsx`:

```tsx
export default function OrderFlow() {
  const { isOpen, close, snapshot } = useOrder();
  // ... rest of the component
}
```

Remove the `{ flavors }: { flavors: Flavor[] }` parameter and any references to `flavors` in the component body.

- [ ] **Step 12.7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors. If you see errors about missing references to `Flavor`, `DeliveryZone`, `OrderSummary`, etc., remove the corresponding usages — they should all be gone.

- [ ] **Step 12.8: Commit**

```bash
git add src/components/OrderFlow.tsx src/components/OrderFlowMount.tsx
git commit -m "Refactor Step 2 (What) to use Square snapshot; remove cannoli scaffold"
```

---

## Task 13: Refactor Step 3 (How) to pickup-only

**Files:**
- Modify: `src/components/OrderFlow.tsx`

- [ ] **Step 13.1: Write the new `StepHow`**

Add (or replace) `StepHow` in `OrderFlow.tsx`:

```tsx
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
          <strong>Pickup window:</strong> {order.date && order.time ? `${order.date} at ${order.time}` : "—"}
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
```

- [ ] **Step 13.2: Update the dispatch in the modal body**

Find the body block:

```tsx
{step === 2 && <StepHow order={order} setOrder={setOrder} />}
```

Replace with:

```tsx
{step === 2 && <StepHow order={order} />}
```

- [ ] **Step 13.3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 13.4: Commit**

```bash
git add src/components/OrderFlow.tsx
git commit -m "Replace Step 3 (How) with pickup-only confirmation"
```

---

## Task 14: SquareCard component (Web Payments SDK)

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/order/SquareCard.tsx`

- [ ] **Step 14.1: Add the Web Payments SDK script tag**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import Script from "next/script";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Romolo's Cannoli | Authentic Italian Cannoli Since 1965",
  description:
    "Handcrafted Sicilian cannoli made with love for over 60 years. Fresh ricotta, crispy shells, and traditional family recipes passed down through generations.",
  icons: {
    icon: "/favicon.ico",
  },
};

const SQUARE_SDK_URL =
  process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        {children}
        <Script src={SQUARE_SDK_URL} strategy="afterInteractive" />
      </body>
    </html>
  );
}
```

- [ ] **Step 14.2: Add the SquareCard component**

Create `src/components/order/SquareCard.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Square?: any;
  }
}

export type SquareCardHandle = {
  tokenize: () => Promise<{ token: string } | { error: string }>;
};

export function SquareCard({
  onReady,
  onError,
}: {
  onReady?: (handle: SquareCardHandle) => void;
  onError?: (msg: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let cardInstance: any = null;

    async function init() {
      const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
      const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
      if (!appId || !locationId) {
        setStatus("error");
        setErrorMsg("Square is not configured.");
        onError?.("Square is not configured.");
        return;
      }

      // Wait for the SDK to load (script is in layout.tsx)
      const start = Date.now();
      while (!window.Square && Date.now() - start < 8000) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (!window.Square) {
        setStatus("error");
        setErrorMsg("Card field couldn't load — please refresh.");
        onError?.("Square SDK failed to load");
        return;
      }
      if (cancelled) return;

      try {
        const payments = window.Square.payments(appId, locationId);
        cardInstance = await payments.card();
        await cardInstance.attach(containerRef.current);
        if (cancelled) {
          await cardInstance.destroy();
          return;
        }
        setStatus("ready");
        onReady?.({
          tokenize: async () => {
            const result = await cardInstance.tokenize();
            if (result.status === "OK") {
              return { token: result.token };
            }
            const errors = result.errors ?? [];
            return {
              error:
                errors[0]?.message ?? "Card could not be processed.",
            };
          },
        });
      } catch (err: any) {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg(err?.message ?? "Card field error.");
        onError?.(err?.message ?? "Card field error.");
      }
    }

    init();

    return () => {
      cancelled = true;
      if (cardInstance) {
        cardInstance.destroy?.().catch(() => {});
      }
    };
  }, [onReady, onError]);

  return (
    <div>
      <div
        ref={containerRef}
        className="p-3 border border-romolo-border rounded-sm bg-white min-h-[60px]"
      />
      {status === "loading" && (
        <div className="mt-2 text-xs text-romolo-warm-gray">Loading secure card field…</div>
      )}
      {status === "error" && (
        <div className="mt-2 text-xs text-romolo-red">{errorMsg}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 14.3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 14.4: Commit**

```bash
git add src/app/layout.tsx src/components/order/SquareCard.tsx
git commit -m "Add Square Web Payments SDK loader and SquareCard component"
```

---

## Task 15: Order builder + createOrderAndPayment (TDD for builder)

**Files:**
- Create: `src/lib/square/orders.ts`
- Create: `src/lib/square/orders.test.ts`

- [ ] **Step 15.1: Write failing tests for `buildOrderPayload`**

Create `src/lib/square/orders.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildOrderPayload } from "./orders";
import type { OrderRequest } from "./types";

describe("buildOrderPayload", () => {
  const baseRequest: OrderRequest = {
    idempotencyKey: "abc-123",
    sourceId: "cnon:fake",
    pickupAt: "2026-05-10T19:00:00Z",
    contact: { name: "Jane", phone: "650-555-0100", email: "jane@example.com" },
    lines: [
      {
        catalogObjectId: "VAR_COOKIES",
        quantity: 1,
        modifiers: ["MOD_AMARETTI"],
      },
    ],
  };

  it("builds an Order with line items, modifiers, and pickup fulfillment", () => {
    const payload = buildOrderPayload(baseRequest, "LOC_TEST");
    expect(payload.idempotencyKey).toBe("abc-123");
    expect(payload.order.locationId).toBe("LOC_TEST");
    expect(payload.order.lineItems).toEqual([
      {
        catalogObjectId: "VAR_COOKIES",
        quantity: "1",
        modifiers: [{ catalogObjectId: "MOD_AMARETTI" }],
      },
    ]);
    expect(payload.order.fulfillments).toHaveLength(1);
    const f = payload.order.fulfillments![0];
    expect(f.type).toBe("PICKUP");
    expect((f as any).pickupDetails.pickupAt).toBe("2026-05-10T19:00:00Z");
    expect((f as any).pickupDetails.recipient.displayName).toBe("Jane");
    expect((f as any).pickupDetails.recipient.emailAddress).toBe("jane@example.com");
    expect((f as any).pickupDetails.recipient.phoneNumber).toBe("650-555-0100");
  });

  it("omits modifiers from a line when none are selected", () => {
    const payload = buildOrderPayload(
      { ...baseRequest, lines: [{ catalogObjectId: "VAR_X", quantity: 2, modifiers: [] }] },
      "LOC_TEST"
    );
    expect(payload.order.lineItems![0]).toEqual({
      catalogObjectId: "VAR_X",
      quantity: "2",
    });
  });
});
```

- [ ] **Step 15.2: Run tests to confirm they fail**

Run: `npm test`
Expected: `Cannot find module './orders'`.

- [ ] **Step 15.3: Implement orders.ts**

Create `src/lib/square/orders.ts`:

```ts
import "server-only";
import { squareClient, squareLocationId } from "./client";
import type { OrderRequest, OrderResult } from "./types";

export function buildOrderPayload(req: OrderRequest, locationId: string) {
  const lineItems = req.lines.map((l) => {
    const item: any = {
      catalogObjectId: l.catalogObjectId,
      quantity: String(l.quantity),
    };
    if (l.modifiers.length > 0) {
      item.modifiers = l.modifiers.map((m) => ({ catalogObjectId: m }));
    }
    return item;
  });

  return {
    idempotencyKey: req.idempotencyKey,
    order: {
      locationId,
      lineItems,
      fulfillments: [
        {
          type: "PICKUP" as const,
          state: "PROPOSED" as const,
          pickupDetails: {
            pickupAt: req.pickupAt,
            recipient: {
              displayName: req.contact.name,
              emailAddress: req.contact.email,
              phoneNumber: req.contact.phone,
            },
          },
        },
      ],
    },
  };
}

export async function createOrderAndPayment(
  req: OrderRequest
): Promise<OrderResult> {
  const client = squareClient();
  const locationId = squareLocationId();
  const payload = buildOrderPayload(req, locationId);

  let orderId: string;
  let totalAmount: bigint;
  try {
    const { order } = await client.orders.create(payload as any);
    if (!order?.id || order.totalMoney?.amount == null) {
      return {
        status: "square_error",
        code: "ORDER_INVALID",
        message: "Square returned an order without an id or total.",
      };
    }
    orderId = order.id;
    totalAmount = order.totalMoney.amount as bigint;
  } catch (err: any) {
    return mapSquareError(err);
  }

  try {
    const { payment } = await client.payments.create({
      sourceId: req.sourceId,
      idempotencyKey: req.idempotencyKey + "-pay",
      amountMoney: { amount: totalAmount, currency: "USD" },
      locationId,
      orderId,
      autocomplete: true,
      buyerEmailAddress: req.contact.email,
    });
    if (!payment?.id) {
      return {
        status: "square_error",
        code: "PAYMENT_INVALID",
        message: "Payment did not return an id.",
      };
    }
  } catch (err: any) {
    return mapSquareError(err);
  }

  return {
    status: "ok",
    orderId,
    confirmation: orderId.slice(0, 8).toUpperCase(),
  };
}

function mapSquareError(err: any): OrderResult {
  const errors = err?.errors ?? err?.body?.errors ?? [];
  const first = errors[0];
  const code: string = first?.code ?? "UNKNOWN";
  const message: string =
    first?.detail ?? first?.message ?? err?.message ?? "Unknown Square error.";

  if (
    code === "INSUFFICIENT_INVENTORY" ||
    code === "ITEM_VARIATION_MISSING" ||
    code === "OUT_OF_STOCK"
  ) {
    return { status: "out_of_stock", itemNames: [] };
  }
  if (
    code === "CARD_DECLINED" ||
    code === "CVV_FAILURE" ||
    code === "INVALID_EXPIRATION" ||
    code === "GENERIC_DECLINE" ||
    code === "INSUFFICIENT_FUNDS"
  ) {
    return { status: "card_declined", message };
  }
  return { status: "square_error", code, message };
}
```

- [ ] **Step 15.4: Run tests to confirm they pass**

Run: `npm test`
Expected: all tests pass (serializers, hours, orders).

- [ ] **Step 15.5: Commit**

```bash
git add src/lib/square/orders.ts src/lib/square/orders.test.ts
git commit -m "Add Order + Payment builder and Square error mapper"
```

---

## Task 16: POST /api/orders route

**Files:**
- Create: `src/app/api/orders/route.ts`

- [ ] **Step 16.1: Write the route**

Create `src/app/api/orders/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrderAndPayment } from "@/lib/square/orders";

const lineSchema = z.object({
  catalogObjectId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  modifiers: z.array(z.string()),
});

const bodySchema = z.object({
  idempotencyKey: z.string().min(1).max(64),
  sourceId: z.string().min(1),
  pickupAt: z.string().datetime(),
  contact: z.object({
    name: z.string().min(1).max(100),
    phone: z.string().min(1).max(40),
    email: z.string().email(),
  }),
  lines: z.array(lineSchema).min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { status: "invalid_payload", field: "body", message: "Body is not valid JSON." },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        status: "invalid_payload",
        field: issue.path.join("."),
        message: issue.message,
      },
      { status: 400 }
    );
  }

  const result = await createOrderAndPayment(parsed.data);
  const httpStatus = result.status === "ok" ? 200 : 400;
  return NextResponse.json(result, { status: httpStatus });
}
```

- [ ] **Step 16.2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 16.3: Commit**

```bash
git add src/app/api/orders/route.ts
git commit -m "Add POST /api/orders route with Zod validation"
```

---

## Task 17: Wire Step 4 (Pay) submit + Step 5 confirmation

**Files:**
- Modify: `src/components/OrderFlow.tsx`

- [ ] **Step 17.1: Replace `StepPay` with the real submit**

In `OrderFlow.tsx`, replace `StepPay` with:

```tsx
function StepPay({
  order,
  setOrder,
  cardHandle,
  setCardHandle,
  errorBanner,
}: {
  order: Order;
  setOrder: (o: Order) => void;
  cardHandle: SquareCardHandle | null;
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
```

- [ ] **Step 17.2: Add submit logic to the `OrderFlow` component**

In the `OrderFlow` component, add state and a submit handler. Replace the existing footer button onClick:

```tsx
const [cardHandle, setCardHandle] = useState<SquareCardHandle | null>(null);
const [submitting, setSubmitting] = useState(false);
const [errorBanner, setErrorBanner] = useState<string | null>(null);

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

  const idempotencyKey = order.idempotencyKey || crypto.randomUUID();
  if (!order.idempotencyKey) setOrder({ ...order, idempotencyKey });

  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idempotencyKey,
      sourceId: tokenResult.token,
      pickupAt,
      contact: order.contact,
      lines: order.lines.map((l) => ({
        catalogObjectId: l.variationId,
        quantity: l.qty,
        modifiers: Object.values(l.modifiers).flat(),
      })),
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
    setErrorBanner("One of your items just sold out. Go back and remove it to continue.");
    return;
  }
  setErrorBanner("Something went wrong. Please call us at (650) 574-0625.");
};

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
```

Also extend the `Order` type to include `idempotencyKey?: string`:

```ts
type Order = {
  date: string;
  time: string;
  timeAvailable: boolean;
  lines: OrderLine[];
  fulfillment: "pickup";
  contact: Contact;
  cardOk: boolean;
  confirmation: string;
  idempotencyKey?: string;
};
```

- [ ] **Step 17.3: Update the footer button to call `placeOrder`**

Replace the footer's "Place order" button onClick:

```tsx
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
```

- [ ] **Step 17.4: Update the body dispatch for Step 4**

Replace:

```tsx
{step === 3 && <StepPay order={order} setOrder={setOrder} />}
```

With:

```tsx
{step === 3 && (
  <StepPay
    order={order}
    setOrder={setOrder}
    cardHandle={cardHandle}
    setCardHandle={setCardHandle}
    errorBanner={errorBanner}
  />
)}
```

- [ ] **Step 17.5: Update Step 5 (Done) to display the real confirmation**

The existing `StepDone` already reads `order.confirmation` — no change needed; the real confirmation now flows through.

- [ ] **Step 17.6: Add the SquareCardHandle import**

At the top of `OrderFlow.tsx`, add:

```tsx
import { SquareCard, type SquareCardHandle } from "./order/SquareCard";
```

- [ ] **Step 17.7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 17.8: Commit**

```bash
git add src/components/OrderFlow.tsx
git commit -m "Wire Step 4 to Square Web Payments and POST /api/orders"
```

---

## Task 18: Mark Cannoli scaffolding in `data.ts`

**Files:**
- Modify: `src/lib/data.ts`

- [ ] **Step 18.1: Add the comment header**

Open `src/lib/data.ts` and prepend this comment to the file (above all exports):

```ts
/**
 * NOTE (Square integration milestone):
 * The exports in this file are no longer used by the active Order Flow.
 * They remain as Cannoli scaffolding (`MENU_DATA` items, `INITIAL_FLAVORS`,
 * `DELIVERY_ZONES`, `REVIEWS`, `fmt`) for parts of the homepage that still
 * reference them — see Menu.tsx, Testimonials.tsx — and for re-use when
 * Cannoli ordering is wired in. Do not add new menu items here. Live order
 * data comes from `getMenuSnapshot()` in `lib/square/catalog.ts`.
 */
```

- [ ] **Step 18.2: Commit**

```bash
git add src/lib/data.ts
git commit -m "Mark data.ts as Cannoli scaffolding pending re-wire"
```

---

## Task 19: README — Railway env var setup

**Files:**
- Modify: `README.md`

- [ ] **Step 19.1: Append a Square integration section**

Append to `README.md`:

```markdown
## Square Integration

The "Start an Order" modal is wired to Square Sandbox. The site requires the
following env vars at build/run time. Set them in Railway via:

```bash
railway variables --set SQUARE_ACCESS_TOKEN=...
railway variables --set SQUARE_LOCATION_ID=...
railway variables --set NEXT_PUBLIC_SQUARE_APPLICATION_ID=...
railway variables --set NEXT_PUBLIC_SQUARE_LOCATION_ID=...
railway variables --set NEXT_PUBLIC_SQUARE_ENVIRONMENT=sandbox
```

| Variable | Used by | Source |
|---|---|---|
| `SQUARE_ACCESS_TOKEN` | server | Square Developer Dashboard → Sandbox → Credentials |
| `SQUARE_LOCATION_ID` | server | Square Sandbox → Locations |
| `NEXT_PUBLIC_SQUARE_APPLICATION_ID` | client | Square Developer Dashboard → App Settings |
| `NEXT_PUBLIC_SQUARE_LOCATION_ID` | client | Same value as `SQUARE_LOCATION_ID` |
| `NEXT_PUBLIC_SQUARE_ENVIRONMENT` | client | `sandbox` or `production` (selects Web Payments SDK URL) |

To flip to Production later: replace `SQUARE_ACCESS_TOKEN` and the two
`*_LOCATION_ID` vars with Production values, and set
`NEXT_PUBLIC_SQUARE_ENVIRONMENT=production`.

Catalog and inventory are revalidated every 15 minutes via Next.js
`revalidate: 900`. Sanity check the integration after deploy via
`GET /api/health`.
```

- [ ] **Step 19.2: Commit**

```bash
git add README.md
git commit -m "Document Square env var setup for Railway"
```

---

## Task 20: End-to-end verification in Square Sandbox

**Files:** none — manual verification.

- [ ] **Step 20.1: Confirm sandbox catalog is seeded**

In the Square Sandbox dashboard for your test merchant, verify the following items exist with reasonable prices:
- Cookies (single variation, with a "Cookie Flavors" modifier list attached, e.g. Amaretti / Rainbow / Cucidati)
- Ice Cream (5 variations: Small, Medium, Pint, Quart, Half Gallon)
- Tiramisu (2 variations: Small, Large)
- Chocolate Banana (single variation)
- Milkshake (single variation)
- Spumoni Wedge (single variation)
- Tartufi (single variation)

Set business hours under the location.

- [ ] **Step 20.2: Deploy and hit /api/health**

Run: `git push`

Wait for Railway deploy. Then:

```bash
curl https://<your-railway-url>/api/health
```

Expected: `ok: true`, `catalogItems` matches your seeded count, `openDays` reflects the Sandbox hours.

- [ ] **Step 20.3: Walk Step 1 (When)**

Open the deployed site, click "Start an Order". Expected:
- Date grid shows 14 days; closed weekdays per Sandbox config are disabled.
- Clicking an open day reveals 30-min time slots within Sandbox hours.

- [ ] **Step 20.4: Walk Step 2 (What)**

Expected:
- Item dropdown shows seven non-cannoli items.
- Selecting Ice Cream shows the size variation chips with prices.
- Selecting Cookies shows the Cookie Flavors modifier as a single-select.
- Selecting Milkshake shows neither variations nor modifiers (just the qty stepper).

- [ ] **Step 20.5: Walk Step 3 (How)**

Expected: a single pickup confirmation card with the shop address. No delivery card visible.

- [ ] **Step 20.6: Walk Step 4 (Pay) — happy path**

Enter name, phone, email. Wait for the Square card field to mount. Use the Square sandbox test card:
- Number: `4111 1111 1111 1111`
- Expiry: any future MM/YY (e.g. `12/29`)
- CVV: `111`
- ZIP: `94403`

Check the agreement box, click "Place order". Expected:
- Step 5 displays the real Square order ID as confirmation.
- The Order appears in Sandbox dashboard under Orders, with the correct line items, modifiers, customer email, and pickup time.

- [ ] **Step 20.7: Walk Step 4 (Pay) — declined card path**

Restart the modal. Use sandbox decline card:
- Number: `4000 0000 0000 0002`
- Expiry/CVV/ZIP: any valid

Expected: "Card declined" banner appears under the card field; user stays on Step 4; submit button re-enables.

- [ ] **Step 20.8: Walk Step 4 (Pay) — out-of-stock path**

In Sandbox, mark Ice Cream Small as out-of-stock. Wait 15 minutes (or trigger a manual page refresh that bypasses cache). The Small chip should appear with strikethrough and "sold out". If you force a stale snapshot through (e.g., place an order before the cache regenerates), Square's order creation rejects it and you see the out-of-stock banner.

- [ ] **Step 20.9: Confirm acceptance criteria**

Re-read the Acceptance Criteria block in `docs/superpowers/specs/2026-05-03-square-integration-design.md`. Each checkbox should now pass. If any fails, file a fix as a follow-up task.

- [ ] **Step 20.10: Final commit (if any tweaks were needed during verification)**

```bash
git add -A
git commit -m "Square integration verified end-to-end in Sandbox"
```

---

## Self-Review Notes

- **Spec coverage:** Every section of the spec maps to a task: deps & types (T1–3), serializers (T4), catalog/inventory (T5), hours (T6), health probe (T7), wiring (T8), Step 1 (T9), components (T10–11), Step 2 (T12), Step 3 (T13), Web Payments (T14), order builder + API route (T15–16), Step 4 + 5 (T17), data.ts comment (T18), env var docs (T19), E2E verification with all acceptance criteria (T20).
- **Type consistency:** `MenuSnapshot`, `SnapshotItem`, `SnapshotVariation`, `SnapshotModifierList`, `SnapshotModifier`, `OpenPeriods`, `OrderRequest`, `OrderResult` are defined once in `types.ts` (T2) and used identically across T4, T5, T6, T8, T10, T11, T12, T15, T16, T17.
- **No placeholders:** Every step contains the actual code or command. Square SDK access points use `as any` only at SDK boundaries (acceptable since these are external types we don't own).
- **Cannoli scaffolding:** Filtered out at the catalog stage (T4 `isCannoliCategory`), and the existing flavor-mix UI is removed in T12 (with a comment block pointing to git history for re-use). `data.ts` is preserved as static-page scaffolding only (T18).
