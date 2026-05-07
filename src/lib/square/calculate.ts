import "server-only";
import { squareClient, squareLocationId } from "./client";
import { buildOrderLineItems } from "./orders";
import type { OrderRequest } from "./types";

// Server-side totals: Square is the only source of truth for subtotal,
// discounts, and grand total. The frontend posts its current cart shape,
// we round-trip it through Square's POST /v2/orders/calculate endpoint
// (no charge, no idempotency), and return a small shape OrderSummary
// renders directly.

export type CalculateRequest = {
  // Same line shape /api/orders accepts. Reused so the calculate result
  // matches the actual order at place-time exactly.
  lines: OrderRequest["lines"];
};

export type CalculatedTotals = {
  subtotalCents: number;
  kitFeeCents: number;
  discountCents: number;
  totalCents: number;
  applied: Array<{ name: string; amountCents: number }>;
};

export type CalculateResult =
  | ({ status: "ok" } & CalculatedTotals)
  | { status: "square_error"; code: string; message: string };

// Pure mapper from Square's calculated Order to the OrderSummary shape.
// Extracted so it can be unit-tested without a live SDK call. Splits
// catalog line items (their grossSalesMoney sums into subtotalCents) from
// ad-hoc lines without a catalogObjectId (their grossSalesMoney sums into
// kitFeeCents — currently the only ad-hoc lines we emit are kit fees).
// Named discounts in `applied` are summed by name so a tier discount that
// applies to multiple lines surfaces as a single row.
export function mapCalculatedOrder(order: any): CalculatedTotals {
  let subtotalCents = 0;
  let kitFeeCents = 0;
  for (const li of order.lineItems ?? []) {
    const gross = Number(li.grossSalesMoney?.amount ?? BigInt(0));
    if (li.catalogObjectId) {
      subtotalCents += gross;
    } else {
      kitFeeCents += gross;
    }
  }
  const discountCents = Number(order.totalDiscountMoney?.amount ?? BigInt(0));
  const totalCents = Number(order.totalMoney?.amount ?? BigInt(0));

  const byName = new Map<string, number>();
  for (const d of order.discounts ?? []) {
    const amount = Number(
      d.appliedMoney?.amount ?? d.amountMoney?.amount ?? BigInt(0),
    );
    if (amount <= 0) continue;
    const name = d.name ?? "Discount";
    byName.set(name, (byName.get(name) ?? 0) + amount);
  }
  const applied = [...byName.entries()].map(([name, amountCents]) => ({
    name,
    amountCents,
  }));

  return { subtotalCents, kitFeeCents, discountCents, totalCents, applied };
}

export async function calculateOrderTotals(
  req: CalculateRequest,
): Promise<CalculateResult> {
  const client = squareClient();
  const locationId = squareLocationId();
  try {
    const { order } = await client.orders.calculate({
      order: {
        locationId,
        // Same opt-in as createOrderAndPayment — without it AUTOMATIC
        // pricing rules don't fire and the calculate would understate any
        // discount the actual order will receive.
        pricingOptions: { autoApplyDiscounts: true },
        lineItems: buildOrderLineItems(req.lines),
      },
    } as any);
    if (!order) {
      return {
        status: "square_error",
        code: "ORDER_INVALID",
        message: "Square calculate returned no order.",
      };
    }
    return { status: "ok", ...mapCalculatedOrder(order) };
  } catch (err: any) {
    const errors = err?.errors ?? err?.body?.errors ?? [];
    const first = errors[0];
    return {
      status: "square_error",
      code: first?.code ?? "UNKNOWN",
      message:
        first?.detail ?? first?.message ?? err?.message ?? "Square error",
    };
  }
}
