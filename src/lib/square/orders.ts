import "server-only";
import { squareClient, squareLocationId } from "./client";
import type { OrderRequest, OrderResult } from "./types";

// Adapts a CartLine (one per cart row) into one or two Square line items:
// the cannoli line and (when kitModifier is present) a sibling ad-hoc
// "Cannoli Kit" line that carries the per-kit fee. Used by both order
// creation and totals calculation so the shape stays in lock-step.
export function buildOrderLineItems(
  lines: ReadonlyArray<OrderRequest["lines"][number]>,
): any[] {
  const lineItems: any[] = [];
  for (const l of lines) {
    const item: any = {
      catalogObjectId: l.catalogObjectId,
      quantity: String(l.quantity),
    };
    if (l.uid) item.uid = l.uid;
    const modifierEntries: any[] = l.modifiers.map((m) => ({
      catalogObjectId: m,
    }));
    if (modifierEntries.length > 0) {
      item.modifiers = modifierEntries;
    }
    if (l.note && l.note.trim().length > 0) {
      item.note = l.note.trim();
    }
    lineItems.push(item);
    if (l.kitModifier) {
      // Square modifier prices scale with line qty even when the modifier's
      // own `quantity` field is set, so a $2-per-6-cannolis fee can't be
      // expressed as a modifier on the cannoli line. Emit a sibling ad-hoc
      // line item instead — no catalog_object_id, just name + base_price ×
      // count. The cannoli pricing rule targets the cannoli product set so
      // it skips this line, leaving the discount math untouched.
      // Sibling uid suffixed with "-kit" so calculate's post-discount
      // line totals can fold the fee back into the cart line's price.
      const kitItem: any = {
        name: "Cannoli Kit",
        quantity: String(l.kitModifier.count),
        basePriceMoney: {
          amount: BigInt(l.kitModifier.perKitFeeCents),
          currency: "USD",
        },
      };
      if (l.uid) kitItem.uid = l.uid + "-kit";
      lineItems.push(kitItem);
    }
  }
  return lineItems;
}

export function buildOrderPayload(req: OrderRequest, locationId: string) {
  const note = req.note?.trim();
  return {
    idempotencyKey: req.idempotencyKey,
    order: {
      locationId,
      // AUTOMATIC pricing rules (e.g. our cannoli quantity tiers) only fire
      // on API-created orders when this opt-in is set. Without it, Square
      // ignores the rules and charges the pre-discount total even though our
      // UI shows the discounted total.
      pricingOptions: {
        autoApplyDiscounts: true,
      },
      lineItems: buildOrderLineItems(req.lines),
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
            // Pickup-level customer note. We tried `order.note` first, but
            // the Square Node SDK's Fern-generated Order serializer doesn't
            // declare `note` on its Raw schema and silently strips unknown
            // fields, so the value never reaches Square. PickupDetails.note
            // IS in the SDK schema (max 500 chars) and surfaces on the
            // dashboard order detail and kitchen ticket as the pickup
            // instruction note. Omitted when blank so an empty note doesn't
            // clutter the dashboard.
            ...(note ? { note } : {}),
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
    if (req.payAtPickup) {
      const { payment } = await client.payments.create({
        sourceId: "EXTERNAL",
        idempotencyKey: req.idempotencyKey + "-pay",
        amountMoney: { amount: totalAmount, currency: "USD" },
        locationId,
        orderId,
        autocomplete: true,
        externalDetails: {
          type: "OTHER" as const,
          source: "Pay at Pickup",
        },
      } as any);
      if (!payment?.id) {
        return {
          status: "square_error",
          code: "PAYMENT_INVALID",
          message: "Payment did not return an id.",
        };
      }
    } else {
      const { payment } = await client.payments.create({
        sourceId: req.sourceId!,
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
