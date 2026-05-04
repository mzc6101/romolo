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

// Membership-only check (no quantity filter). The quantity threshold applies
// to the aggregate qty across all matching lines, not any single line.
function isProductInSet(
  set: SnapshotProductSet,
  catalogObjectId: string
): boolean {
  if (set.allProducts) return true;
  if (set.productIdsAny && set.productIdsAny.length > 0) {
    return set.productIdsAny.includes(catalogObjectId);
  }
  if (set.productIdsAll && set.productIdsAll.length > 0) {
    return set.productIdsAll.includes(catalogObjectId);
  }
  return false;
}

function aggregateQtyMeetsThreshold(
  set: SnapshotProductSet,
  aggregateQty: number
): boolean {
  if (set.quantityMin != null && aggregateQty < set.quantityMin) return false;
  if (set.quantityMax != null && aggregateQty > set.quantityMax) return false;
  if (set.quantityExact != null && aggregateQty !== set.quantityExact) return false;
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

  // Step 1: evaluate each AUTOMATIC line-item rule against the AGGREGATE
  // quantity across all cart lines whose variation is in the rule's product
  // set. Square's pricing-rule evaluation is cart-aggregate, not per-line —
  // e.g. 4 cannolis on one line + 2 on another satisfies a quantity_min:6
  // rule, then the per-unit discount is distributed back to each line.
  type FiredRule = {
    rule: SnapshotPricingRule;
    discount: SnapshotDiscount;
    matchedLineKeys: Set<string>;
  };
  const fired: FiredRule[] = [];
  for (const rule of snapshot.pricingRules) {
    if (rule.applicationMode !== "AUTOMATIC") continue;
    if (rule.discountTargetScope !== "LINE_ITEM") continue;
    if (!rule.matchProductsId) continue;
    const set = productSetById.get(rule.matchProductsId);
    if (!set) continue;
    const discount = discountById.get(rule.discountId);
    if (!discount) continue;
    const excludeSet = rule.excludeProductsId
      ? productSetById.get(rule.excludeProductsId)
      : undefined;

    const matchedLines = lines.filter((l) => {
      if (!isProductInSet(set, l.catalogObjectId)) return false;
      if (excludeSet && isProductInSet(excludeSet, l.catalogObjectId)) return false;
      return true;
    });
    if (matchedLines.length === 0) continue;
    const aggregateQty = matchedLines.reduce((s, l) => s + l.quantity, 0);
    if (!aggregateQtyMeetsThreshold(set, aggregateQty)) continue;

    fired.push({
      rule,
      discount,
      matchedLineKeys: new Set(matchedLines.map((l) => l.lineKey)),
    });
  }

  // Step 2: per-line pick the fired rule that yields the largest line
  // savings. Square applies the most-favorable tier rather than stacking
  // overlapping rules, so at aggregate qty 12+ the $1.00/unit tier wins
  // over the $0.50/unit tier even though both match the product_set.
  for (const line of lines) {
    let bestForLine: AppliedDiscount | null = null;
    for (const f of fired) {
      if (!f.matchedLineKeys.has(line.lineKey)) continue;
      const amount = lineDiscountAmount(f.discount, line);
      if (amount <= 0) continue;
      if (!bestForLine || amount > bestForLine.amountCents) {
        bestForLine = {
          ruleId: f.rule.id,
          discountId: f.discount.id,
          name: f.discount.name,
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
