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
