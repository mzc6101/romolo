import { describe, it, expect } from "vitest";
import { computeDiscounts, type DiscountLine } from "./discounts";
import type {
  SnapshotDiscount,
  SnapshotPricingRule,
  SnapshotProductSet,
} from "./types";

const FULL_SINGLE = "VAR_FULL_SINGLE";
const MINI_SINGLE = "VAR_MINI_SINGLE";
const COOKIE = "VAR_COOKIE";

const discount6_11: SnapshotDiscount = {
  id: "D6",
  name: "Full Size 6-11",
  type: "FIXED_AMOUNT",
  amountCents: 50,
};
const discount12: SnapshotDiscount = {
  id: "D12",
  name: "Full Size 12+",
  type: "FIXED_AMOUNT",
  amountCents: 100,
};
const discountMini24: SnapshotDiscount = {
  id: "DM24",
  name: "Mini 24+",
  type: "FIXED_AMOUNT",
  amountCents: 50,
};

// Mirrors the Sandbox: 6-11 product_set has quantity_min only (no max). The
// engine resolves the overlap with the 12+ rule by picking the largest
// per-line discount, not by stacking — see test below.
const set6_11: SnapshotProductSet = {
  id: "PS6",
  productIdsAny: [FULL_SINGLE],
  quantityMin: 6,
};
const set12: SnapshotProductSet = {
  id: "PS12",
  productIdsAny: [FULL_SINGLE],
  quantityMin: 12,
};
const setMini24: SnapshotProductSet = {
  id: "PSM24",
  productIdsAny: [MINI_SINGLE],
  quantityMin: 24,
};

const rules: SnapshotPricingRule[] = [
  {
    id: "R6",
    discountId: "D6",
    matchProductsId: "PS6",
    applicationMode: "AUTOMATIC",
    discountTargetScope: "LINE_ITEM",
  },
  {
    id: "R12",
    discountId: "D12",
    matchProductsId: "PS12",
    applicationMode: "AUTOMATIC",
    discountTargetScope: "LINE_ITEM",
  },
  {
    id: "RM24",
    discountId: "DM24",
    matchProductsId: "PSM24",
    applicationMode: "AUTOMATIC",
    discountTargetScope: "LINE_ITEM",
  },
];

const snapshot = {
  discounts: [discount6_11, discount12, discountMini24],
  pricingRules: rules,
  productSets: [set6_11, set12, setMini24],
};

describe("computeDiscounts", () => {
  it("applies no discount when quantity is below the lowest threshold", () => {
    const lines: DiscountLine[] = [
      { lineKey: "L1", catalogObjectId: FULL_SINGLE, quantity: 5, subtotalCents: 3500 },
    ];
    const result = computeDiscounts(lines, snapshot);
    expect(result.discountCents).toBe(0);
    expect(result.totalCents).toBe(3500);
    expect(result.applied).toEqual([]);
  });

  it("applies $0.50 per unit at the 6-11 tier (6 Full singles)", () => {
    const lines: DiscountLine[] = [
      { lineKey: "L1", catalogObjectId: FULL_SINGLE, quantity: 6, subtotalCents: 4200 },
    ];
    const result = computeDiscounts(lines, snapshot);
    expect(result.discountCents).toBe(300); // 6 × $0.50
    expect(result.totalCents).toBe(3900);
    expect(result.applied).toHaveLength(1);
    expect(result.applied[0].name).toBe("Full Size 6-11");
  });

  it("applies $0.50 per unit at the 6-11 tier (11 Full singles)", () => {
    const lines: DiscountLine[] = [
      { lineKey: "L1", catalogObjectId: FULL_SINGLE, quantity: 11, subtotalCents: 7700 },
    ];
    const result = computeDiscounts(lines, snapshot);
    expect(result.discountCents).toBe(550); // 11 × $0.50
    expect(result.totalCents).toBe(7150);
    expect(result.applied[0].name).toBe("Full Size 6-11");
  });

  it("picks the 12+ tier (not 6-11) at qty 12 — Square takes the larger discount", () => {
    const lines: DiscountLine[] = [
      { lineKey: "L1", catalogObjectId: FULL_SINGLE, quantity: 12, subtotalCents: 8400 },
    ];
    const result = computeDiscounts(lines, snapshot);
    expect(result.discountCents).toBe(1200); // 12 × $1.00
    expect(result.totalCents).toBe(7200);
    expect(result.applied).toHaveLength(1);
    expect(result.applied[0].name).toBe("Full Size 12+");
  });

  it("applies $0.50 per unit at the 24+ Mini tier", () => {
    const lines: DiscountLine[] = [
      { lineKey: "L1", catalogObjectId: MINI_SINGLE, quantity: 24, subtotalCents: 9600 },
    ];
    const result = computeDiscounts(lines, snapshot);
    expect(result.discountCents).toBe(1200); // 24 × $0.50
    expect(result.totalCents).toBe(8400);
  });

  it("never discounts more than the line subtotal", () => {
    const lines: DiscountLine[] = [
      { lineKey: "L1", catalogObjectId: FULL_SINGLE, quantity: 12, subtotalCents: 50 },
    ];
    const result = computeDiscounts(lines, snapshot);
    // 12 × $1.00 = $12.00 nominal, capped at the $0.50 subtotal
    expect(result.discountCents).toBe(50);
    expect(result.totalCents).toBe(0);
  });

  it("evaluates each cart line independently (mixed-quantity lines)", () => {
    const lines: DiscountLine[] = [
      // 5 Full Singles → no discount
      { lineKey: "L1", catalogObjectId: FULL_SINGLE, quantity: 5, subtotalCents: 3500 },
      // 12 Full Singles on a separate line → 12+ tier
      { lineKey: "L2", catalogObjectId: FULL_SINGLE, quantity: 12, subtotalCents: 8400 },
    ];
    const result = computeDiscounts(lines, snapshot);
    expect(result.discountCents).toBe(1200);
    expect(result.applied).toHaveLength(1);
    expect(result.applied[0].lineKey).toBe("L2");
  });

  it("ignores lines that don't match any rule's product set", () => {
    const lines: DiscountLine[] = [
      { lineKey: "L1", catalogObjectId: COOKIE, quantity: 100, subtotalCents: 20000 },
    ];
    const result = computeDiscounts(lines, snapshot);
    expect(result.discountCents).toBe(0);
  });

  it("skips MANUAL rules", () => {
    const manualOnly = {
      ...snapshot,
      pricingRules: [{ ...rules[0], applicationMode: "MANUAL" as const }],
    };
    const lines: DiscountLine[] = [
      { lineKey: "L1", catalogObjectId: FULL_SINGLE, quantity: 6, subtotalCents: 4200 },
    ];
    const result = computeDiscounts(lines, manualOnly);
    expect(result.discountCents).toBe(0);
  });

  it("computes a percentage discount", () => {
    const pctDiscount: SnapshotDiscount = {
      id: "DP",
      name: "10% off Cookies",
      type: "FIXED_PERCENTAGE",
      percentage: 10,
    };
    const pctSet: SnapshotProductSet = {
      id: "PSC",
      productIdsAny: [COOKIE],
      quantityMin: 1,
    };
    const pctRule: SnapshotPricingRule = {
      id: "RP",
      discountId: "DP",
      matchProductsId: "PSC",
      applicationMode: "AUTOMATIC",
      discountTargetScope: "LINE_ITEM",
    };
    const lines: DiscountLine[] = [
      { lineKey: "L1", catalogObjectId: COOKIE, quantity: 3, subtotalCents: 600 },
    ];
    const result = computeDiscounts(lines, {
      discounts: [pctDiscount],
      productSets: [pctSet],
      pricingRules: [pctRule],
    });
    expect(result.discountCents).toBe(60);
    expect(result.totalCents).toBe(540);
  });
});
