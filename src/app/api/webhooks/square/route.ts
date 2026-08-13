import { revalidateTag } from "next/cache";
import { createHmac, timingSafeEqual } from "node:crypto";
import { handlePaymentUpdated } from "@/lib/christmas-export-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATALOG_TAG = "square-catalog";

// catalog.version.updated covers manual sold-out toggles and modifier
// availability changes (both write to *LocationOverrides.sold_out, which
// mutates the catalog). inventory.count.updated covers stock-driven flips
// for variations that have track_inventory=true. Either way, we just need
// to invalidate the catalog snapshot.
const RELEVANT_EVENTS = new Set([
  "catalog.version.updated",
  "inventory.count.updated",
]);

export function verifySquareSignature(
  rawBody: string,
  signatureHeader: string | null,
  signatureKey: string,
  notificationUrl: string
): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", signatureKey)
    .update(notificationUrl + rawBody)
    .digest("base64");
  const received = Buffer.from(signatureHeader, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (received.length !== expectedBuf.length) return false;
  return timingSafeEqual(received, expectedBuf);
}

export async function POST(req: Request) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
  if (!signatureKey || !notificationUrl) {
    console.error(
      "[square-webhook] missing SQUARE_WEBHOOK_SIGNATURE_KEY or SQUARE_WEBHOOK_NOTIFICATION_URL"
    );
    return new Response("Webhook not configured", { status: 503 });
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-square-hmacsha256-signature");
  if (
    !verifySquareSignature(rawBody, signatureHeader, signatureKey, notificationUrl)
  ) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: {
    type?: string;
    event_id?: string;
    data?: { object?: { payment?: { id?: string } } };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (event.type && RELEVANT_EVENTS.has(event.type)) {
    // Next 16 requires a profile arg. expire:0 = purge immediately so the
    // next page render fetches a fresh catalog snapshot from Square.
    revalidateTag(CATALOG_TAG, { expire: 0 });
    return new Response("ok", { status: 200 });
  }

  if (event.type === "payment.updated") {
    try {
      await handlePaymentUpdated(event.data?.object?.payment?.id);
    } catch (error) {
      // Square retries non-2xx webhook deliveries. Canonical Square reads and
      // Google writes are intentionally retryable rather than silently lost.
      console.error("[square-webhook] Christmas export failed", error);
      return new Response("Export failed", { status: 503 });
    }
  }

  return new Response("ok", { status: 200 });
}
