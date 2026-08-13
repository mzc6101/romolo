import "server-only";
import type { Order, Payment } from "square";
import {
  buildChristmasRow,
  christmasPaymentStatus,
  googleChristmasSheetFromEnv,
  serializeChristmasAppend,
  type ChristmasRow,
} from "./christmas-export";
import { squareClient, squareLocationId } from "./square/client";
import { WEBSITE_ORDER_REFERENCE_ID } from "./square/website-order";

export type PaymentUpdatedDependencies = {
  getPayment(paymentId: string): Promise<Payment | undefined>;
  getOrder(orderId: string): Promise<Order | undefined>;
  locationId(): string;
  append(year: string, values: ChristmasRow): Promise<boolean>;
};

function defaultDependencies(): PaymentUpdatedDependencies {
  const client = squareClient();
  return {
    async getPayment(paymentId) {
      return (await client.payments.get({ paymentId })).payment;
    },
    async getOrder(orderId) {
      return (await client.orders.get({ orderId })).order;
    },
    locationId: squareLocationId,
    async append(year, values) {
      const sheet = googleChristmasSheetFromEnv();
      // This check+append lock is sufficient for the single Railway replica.
      // It cannot prevent a duplicate if multiple replicas process the same
      // Square ID concurrently; no cross-replica lock is added by design.
      return serializeChristmasAppend(() => sheet.appendIfMissing(year, values));
    },
  };
}

export async function handlePaymentUpdated(
  paymentId: string | undefined,
  dependencies?: PaymentUpdatedDependencies,
): Promise<void> {
  if (!paymentId) return;
  const deps = dependencies ?? defaultDependencies();

  const payment = await deps.getPayment(paymentId);
  if (
    !payment ||
    payment.status !== "COMPLETED" ||
    !payment.orderId ||
    !christmasPaymentStatus(payment)
  ) {
    return;
  }

  const order = await deps.getOrder(payment.orderId);
  if (
    !order ||
    order.locationId !== deps.locationId() ||
    order.referenceId !== WEBSITE_ORDER_REFERENCE_ID
  ) {
    return;
  }

  const row = buildChristmasRow(order, payment);
  if (!row) return;
  await deps.append(row.year, row.values);
}
