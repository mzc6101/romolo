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

// Mirrors the Sandbox: product_set has quantity_min only, no quantity_max.
// That means at qty>=12 BOTH tier rules fire and stack — see test below.
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

  it("applies the 6-11 tier for 6 Full Size singles", () => {
    const lines: DiscountLine[] = [
      { lineKey: "L1", catalogObjectId: FULL_SINGLE, quantity: 6, subtotalCents: 4200 },
    ];
    const result = computeDiscounts(lines, snapshot);
    expect(result.discountCents).toBe(50);
    expect(result.totalCents).toBe(4150);
    expect(result.applied).toHaveLength(1);
    expect(result.applied[0].name).toBe("Full Size 6-11");
  });

  it("stacks tier discounts when product_sets overlap (mirrors Sandbox)", () => {
    // At qty=12 both the 6-11 and 12+ rules match (6-11 set has no quantity_max
    // in the user's Sandbox), so $0.50 + $1.00 = $1.50 is taken off the line.
    const lines: DiscountLine[] = [
      { lineKey: "L1", catalogObjectId: FULL_SINGLE, quantity: 12, subtotalCents: 8400 },
    ];
    const result = computeDiscounts(lines, snapshot);
    expect(result.discountCents).toBe(150);
    expect(result.totalCents).toBe(8250);
    expect(result.applied).toHaveLength(2);
    expect(result.applied.map((a) => a.name).sort()).toEqual([
      "Full Size 12+",
      "Full Size 6-11",
    ]);
  });

  it("applies the 24+ Mini tier", () => {
    const lines: DiscountLine[] = [
      { lineKey: "L1", catalogObjectId: MINI_SINGLE, quantity: 24, subtotalCents: 9600 },
    ];
    const result = computeDiscounts(lines, snapshot);
    expect(result.discountCents).toBe(50);
    expect(result.totalCents).toBe(9550);
  });

  it("never discounts more than the subtotal", () => {
    const lines: DiscountLine[] = [
      { lineKey: "L1", catalogObjectId: FULL_SINGLE, quantity: 12, subtotalCents: 50 },
    ];
    const result = computeDiscounts(lines, snapshot);
    // discount cents would be 100 but subtotal is only 50
    expect(result.discountCents).toBe(50);
    expect(result.totalCents).toBe(0);
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
