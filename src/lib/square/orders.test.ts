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
