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

// FIXED_AMOUNT discounts are per qualifying unit (e.g. -$0.50 per cannoli),
// not flat per line — that's how Square applies them when an automatic
// pricing rule with quantity thresholds fires.
function lineDiscountAmount(
  discount: SnapshotDiscount,
  line: DiscountLine
): number {
  if (discount.type === "FIXED_AMOUNT") {
    const perUnit = discount.amountCents ?? 0;
    return Math.min(perUnit * line.quantity, line.subtotalCents);
  }
  if (discount.type === "FIXED_PERCENTAGE") {
    const pct = discount.percentage ?? 0;
    return Math.floor((line.subtotalCents * pct) / 100);
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

  // Per-line: pick the single matching AUTOMATIC rule that yields the largest
  // savings. Square applies the most-favorable tier rather than stacking
  // overlapping pricing rules, so a 12-pack of cannolis only gets the 12+
  // discount even when the 6-11 rule's product_set also matches.
  for (const line of lines) {
    let bestForLine: AppliedDiscount | null = null;
    for (const rule of snapshot.pricingRules) {
      if (rule.applicationMode !== "AUTOMATIC") continue;
      if (rule.discountTargetScope !== "LINE_ITEM") continue;
      if (!rule.matchProductsId) continue;
      const set = productSetById.get(rule.matchProductsId);
      if (!set) continue;
      if (!matchesProductSet(set, line)) continue;
      const excludeSet = rule.excludeProductsId
        ? productSetById.get(rule.excludeProductsId)
        : undefined;
      if (excludeSet && matchesProductSet(excludeSet, line)) continue;
      const discount = discountById.get(rule.discountId);
      if (!discount) continue;
      const amount = lineDiscountAmount(discount, line);
      if (amount <= 0) continue;
      if (!bestForLine || amount > bestForLine.amountCents) {
        bestForLine = {
          ruleId: rule.id,
          discountId: discount.id,
          name: discount.name,
          amountCents: amount,
          scope: "LINE_ITEM",
          lineKey: line.lineKey,
        };
      }
    }
    if (bestForLine) {
      applied.push(bestForLine);
      total += bestForLine.amountCents;
    }
  }

  // ORDER-scope automatic rules apply once to the whole subtotal; same
  // best-wins choice if multiple match.
  let bestOrder: AppliedDiscount | null = null;
  for (const rule of snapshot.pricingRules) {
    if (rule.applicationMode !== "AUTOMATIC") continue;
    if (rule.discountTargetScope !== "ORDER") continue;
    const discount = discountById.get(rule.discountId);
    if (!discount) continue;
    const fakeOrderLine: DiscountLine = {
      lineKey: "__order__",
      catalogObjectId: "",
      quantity: 1,
      subtotalCents,
    };
    const amount = lineDiscountAmount(discount, fakeOrderLine);
    if (amount <= 0) continue;
    if (!bestOrder || amount > bestOrder.amountCents) {
      bestOrder = {
        ruleId: rule.id,
        discountId: discount.id,
        name: discount.name,
        amountCents: amount,
        scope: "ORDER",
      };
    }
  }
  if (bestOrder) {
    applied.push(bestOrder);
    total += bestOrder.amountCents;
  }

  const cappedTotal = Math.min(total, subtotalCents);
  return {
    subtotalCents,
    discountCents: cappedTotal,
    totalCents: subtotalCents - cappedTotal,
    applied,
  };
}
