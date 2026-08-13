import { describe, expect, it, vi } from "vitest";
import type { Order, Payment } from "square";
import { handlePaymentUpdated, type PaymentUpdatedDependencies } from "./christmas-export-handler";

function dependencies(overrides: Partial<PaymentUpdatedDependencies> = {}) {
  const payment: Payment = {
    id: "PAY",
    status: "COMPLETED",
    sourceType: "CARD",
    orderId: "ORDER",
  };
  const order: Order = {
    id: "ORDER",
    locationId: "LOC",
    referenceId: "romolo-website",
    fulfillments: [{
      type: "PICKUP",
      pickupDetails: {
        pickupAt: "2026-12-24T18:00:00Z",
        recipient: { displayName: "Jane", phoneNumber: "555" },
      },
    }],
    lineItems: [{ name: "Cookies", quantity: "1" }],
  };
  return {
    getPayment: vi.fn(async () => payment),
    getOrder: vi.fn(async () => order),
    locationId: vi.fn(() => "LOC"),
    append: vi.fn(async () => true),
    ...overrides,
  } satisfies PaymentUpdatedDependencies;
}

describe("handlePaymentUpdated", () => {
  it("fetches canonical objects and appends an eligible row", async () => {
    const deps = dependencies();
    await handlePaymentUpdated("PAY", deps);
    expect(deps.getPayment).toHaveBeenCalledWith("PAY");
    expect(deps.getOrder).toHaveBeenCalledWith("ORDER");
    expect(deps.append).toHaveBeenCalledWith("2026", [
      "Jane", "10:00 AM", "12/24", "Yes", "No", "1x Cookies", "", "555", "ORDER",
    ]);
  });

  it.each([
    ["non-completed", { getPayment: vi.fn(async () => ({ status: "PENDING", orderId: "ORDER" })) }],
    ["wrong location", { locationId: vi.fn(() => "OTHER") }],
    ["manual order", { getOrder: vi.fn(async () => ({ id: "ORDER", locationId: "LOC", referenceId: "manual" })) }],
    ["unknown payment source", { getPayment: vi.fn(async () => ({ status: "COMPLETED", orderId: "ORDER", sourceType: "CASH" })) }],
  ])("no-ops for %s", async (_name, override) => {
    const deps = dependencies(override as Partial<PaymentUpdatedDependencies>);
    await handlePaymentUpdated("PAY", deps);
    expect(deps.append).not.toHaveBeenCalled();
  });

  it("propagates transient Square and Google failures for webhook retry", async () => {
    await expect(handlePaymentUpdated("PAY", dependencies({
      getPayment: vi.fn(async () => { throw new Error("Square unavailable"); }),
    }))).rejects.toThrow("Square unavailable");
    await expect(handlePaymentUpdated("PAY", dependencies({
      append: vi.fn(async () => { throw new Error("Google unavailable"); }),
    }))).rejects.toThrow("Google unavailable");
  });
});
