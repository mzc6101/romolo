import { describe, it, expect } from "vitest";
import { mapCalculatedOrder } from "./calculate";

// Walks the synthetic Order shape Square returns from POST /v2/orders/calculate
// and pulls out the four numbers + named-discount breakdown the OrderSummary
// renders. `mapCalculatedOrder` is the pure mapper extracted from
// calculateOrderTotals so it can be exercised without a live SDK.

const usd = (n: number) => ({ amount: BigInt(n), currency: "USD" as const });

describe("mapCalculatedOrder", () => {
  it("returns zeros for an empty order", () => {
    const result = mapCalculatedOrder({ lineItems: [], discounts: [], totalMoney: usd(0), totalDiscountMoney: usd(0) } as any);
    expect(result).toEqual({
      subtotalCents: 0,
      kitFeeCents: 0,
      discountCents: 0,
      totalCents: 0,
      applied: [],
      lineTotals: {},
    });
  });

  it("returns post-discount line totals keyed by uid, folding -kit sibling into the parent uid", () => {
    const result = mapCalculatedOrder({
      // 6 Full Cannoli @ $7 base, with a $0.50/ea tier discount → totalMoney
      // per line is $39, plus a $2 kit fee. Sibling kit-fee uid suffix
      // "-kit" should fold back into the parent cart uid.
      totalMoney: usd(4100),
      totalDiscountMoney: usd(300),
      lineItems: [
        {
          uid: "abc123",
          catalogObjectId: "VAR_RIC_FULL",
          quantity: "6",
          grossSalesMoney: usd(4200),
          totalMoney: usd(3900),
        },
        {
          uid: "abc123-kit",
          name: "Cannoli Kit",
          quantity: "1",
          grossSalesMoney: usd(200),
          totalMoney: usd(200),
        },
      ],
      discounts: [{ uid: "D1", name: "Full 6+", appliedMoney: usd(300) }],
    } as any);
    expect(result.lineTotals).toEqual({ abc123: 4100 });
  });

  it("omits a uid from lineTotals when the input line had no uid", () => {
    const result = mapCalculatedOrder({
      totalMoney: usd(700),
      totalDiscountMoney: usd(0),
      lineItems: [
        {
          catalogObjectId: "V_X",
          quantity: "1",
          grossSalesMoney: usd(700),
          totalMoney: usd(700),
        },
      ],
      discounts: [],
    } as any);
    expect(result.lineTotals).toEqual({});
  });

  it("sums catalog-line gross sales into subtotal", () => {
    const result = mapCalculatedOrder({
      totalMoney: usd(8400),
      totalDiscountMoney: usd(0),
      lineItems: [
        { catalogObjectId: "VAR_RIC_FULL", quantity: "12", grossSalesMoney: usd(8400) },
      ],
      discounts: [],
    } as any);
    expect(result.subtotalCents).toBe(8400);
    expect(result.kitFeeCents).toBe(0);
    expect(result.totalCents).toBe(8400);
  });

  it("splits ad-hoc Cannoli Kit lines into kitFeeCents (catalog lines stay in subtotal)", () => {
    const result = mapCalculatedOrder({
      totalMoney: usd(8800),
      totalDiscountMoney: usd(0),
      lineItems: [
        // Catalog cannoli line: 12 × $7 = $84
        { catalogObjectId: "VAR_RIC_FULL", quantity: "12", grossSalesMoney: usd(8400) },
        // Ad-hoc kit fee line: 2 × $2 = $4
        { name: "Cannoli Kit", quantity: "2", grossSalesMoney: usd(400) },
      ],
      discounts: [],
    } as any);
    expect(result.subtotalCents).toBe(8400);
    expect(result.kitFeeCents).toBe(400);
    expect(result.totalCents).toBe(8800);
  });

  it("reads totalCents from totalMoney and discountCents from totalDiscountMoney", () => {
    const result = mapCalculatedOrder({
      totalMoney: usd(7200),
      totalDiscountMoney: usd(1200),
      lineItems: [
        { catalogObjectId: "VAR_RIC_FULL", quantity: "12", grossSalesMoney: usd(8400) },
      ],
      discounts: [
        { uid: "D1", name: "Full Size 12+", appliedMoney: usd(1200) },
      ],
    } as any);
    expect(result.discountCents).toBe(1200);
    expect(result.totalCents).toBe(7200);
  });

  it("maps order.discounts to a named breakdown summed by name", () => {
    const result = mapCalculatedOrder({
      totalMoney: usd(10000),
      totalDiscountMoney: usd(1500),
      lineItems: [
        { catalogObjectId: "V_A", quantity: "1", grossSalesMoney: usd(10000) },
      ],
      discounts: [
        { uid: "D1", name: "Full Size 12+", appliedMoney: usd(1000) },
        { uid: "D2", name: "Full Size 12+", appliedMoney: usd(500) },
        { uid: "D3", name: "Empty", appliedMoney: usd(0) },
      ],
    } as any);
    expect(result.applied).toEqual([
      { name: "Full Size 12+", amountCents: 1500 },
    ]);
  });

  it("falls back to amountMoney when appliedMoney is absent on a calculated discount", () => {
    const result = mapCalculatedOrder({
      totalMoney: usd(0),
      totalDiscountMoney: usd(300),
      lineItems: [],
      discounts: [
        { uid: "D1", name: "Mini 24+", amountMoney: usd(300) },
      ],
    } as any);
    expect(result.applied).toEqual([
      { name: "Mini 24+", amountCents: 300 },
    ]);
  });

  it("uses 'Discount' as the name fallback when name is missing", () => {
    const result = mapCalculatedOrder({
      totalMoney: usd(0),
      totalDiscountMoney: usd(100),
      lineItems: [],
      discounts: [{ uid: "D1", appliedMoney: usd(100) }],
    } as any);
    expect(result.applied[0]?.name).toBe("Discount");
  });
});
