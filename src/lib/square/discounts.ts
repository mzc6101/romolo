import type {
  MenuSnapshot,
  SnapshotDiscount,
  SnapshotPricingRule,
  SnapshotProductSet,
} from "./types";

// What the discount engine needs to know about each cart line. Subtotal is
// post-modifier, pre-discount, in cents. catalogObjectId is the Square
// variation id (used to match against product_sets).
export type DiscountLine = {
  lineKey: string;
  catalogObjectId: string;
  quantity: number;
  subtotalCents: number;
};

export type AppliedDiscount = {
  ruleId: string;
  discountId: string;
  name: string;
  amountCents: number;
  // Which cart line the discount applies to ("ORDER" if scope is order-wide).
  scope: "LINE_ITEM" | "ORDER";
  lineKey?: string;
};

export type DiscountResult = {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  applied: AppliedDiscount[];
};

function matchesProductSet(
  set: SnapshotProductSet,
  line: DiscountLine
): boolean {
  if (set.quantityMin != null && line.quantity < set.quantityMin) return false;
  if (set.quantityMax != null && line.quantity > set.quantityMax) return false;
  if (set.quantityExact != null && line.quantity !== set.quantityExact) return false;

  if (set.allProducts) return true;
  if (
    set.productIdsAny &&
    set.productIdsAny.length > 0 &&
    !set.productIdsAny.includes(line.catalogObjectId)
  ) {
    return false;
  }
  // product_ids_all on a CatalogProductSet means "every listed product must be
  // present in the cart" — but for per-line evaluation it's typically used
  // alongside product_ids_any. We treat product_ids_all conservatively as a
  // membership check for the single line we're evaluating.
  if (
    set.productIdsAll &&
    set.productIdsAll.length > 0 &&
    !set.productIdsAll.includes(line.catalogObjectId)
  ) {
    return false;
  }
  return true;
}

function lineDiscountAmount(
  discount: SnapshotDiscount,
  lineSubtotalCents: number
): number {
  if (discount.type === "FIXED_AMOUNT") {
    const amount = discount.amountCents ?? 0;
    return Math.min(amount, lineSubtotalCents);
  }
  if (discount.type === "FIXED_PERCENTAGE") {
    const pct = discount.percentage ?? 0;
    return Math.floor((lineSubtotalCents * pct) / 100);
  }
  // VARIABLE_* discounts can't be auto-applied without customer input.
  return 0;
}

export function computeDiscounts(
  lines: DiscountLine[],
  snapshot: Pick<MenuSnapshot, "discounts" | "pricingRules" | "productSets">
): DiscountResult {
  const subtotalCents = lines.reduce((sum, l) => sum + l.subtotalCents, 0);

  const discountById = new Map(
    snapshot.discounts.map((d) => [d.id, d] as const)
  );
  const productSetById = new Map(
    snapshot.productSets.map((p) => [p.id, p] as const)
  );

  const applied: AppliedDiscount[] = [];
  let total = 0;

  for (const rule of snapshot.pricingRules) {
    if (rule.applicationMode !== "AUTOMATIC") continue;
    const discount = discountById.get(rule.discountId);
    if (!discount) continue;

    if (rule.discountTargetScope === "LINE_ITEM") {
      if (!rule.matchProductsId) continue;
      const set = productSetById.get(rule.matchProductsId);
      if (!set) continue;
      const excludeSet = rule.excludeProductsId
        ? productSetById.get(rule.excludeProductsId)
        : undefined;

      for (const line of lines) {
        if (!matchesProductSet(set, line)) continue;
        if (excludeSet && matchesProductSet(excludeSet, line)) continue;
        const amount = lineDiscountAmount(discount, line.subtotalCents);
        if (amount <= 0) continue;
        applied.push({
          ruleId: rule.id,
          discountId: discount.id,
          name: discount.name,
          amountCents: amount,
          scope: "LINE_ITEM",
          lineKey: line.lineKey,
        });
        total += amount;
      }
    } else {
      // ORDER scope — apply once to the whole subtotal. None of the current
      // rules use this; safe minimal handling.
      const amount = lineDiscountAmount(discount, subtotalCents);
      if (amount > 0) {
        applied.push({
          ruleId: rule.id,
          discountId: discount.id,
          name: discount.name,
          amountCents: amount,
          scope: "ORDER",
        });
        total += amount;
      }
    }
  }

  const cappedTotal = Math.min(total, subtotalCents);
  return {
    subtotalCents,
    discountCents: cappedTotal,
    totalCents: subtotalCents - cappedTotal,
    applied,
  };
}
