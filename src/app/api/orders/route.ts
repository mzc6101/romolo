import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrderAndPayment } from "@/lib/square/orders";

const lineSchema = z.object({
  // Stable cart-line id, threaded through Square as line_item.uid so
  // /api/orders/calculate can return per-line post-discount totals keyed by
  // it (see calculate.ts). Optional — older clients without per-line
  // totals work fine without one.
  uid: z.string().min(1).max(60).optional(),
  catalogObjectId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  modifiers: z.array(z.string()),
  // Square line-item notes cap at 2000 chars; we cap a bit lower for safety.
  note: z.string().max(500).optional(),
  // Set when the line came from the Cannoli Kit composite. Server emits an
  // ad-hoc Square line item right after the cannoli line at this price ×
  // count. POS visibility comes from the "Cannoli Kit" line-note prefix
  // applied client-side, same pattern as the Set composite.
  kitModifier: z
    .object({
      perKitFeeCents: z.number().int().min(0).max(10_000),
      count: z.number().int().min(1).max(20),
    })
    .optional(),
});

const bodySchema = z.object({
  idempotencyKey: z.string().min(1).max(64),
  sourceId: z.string().min(1).optional(),
  payAtPickup: z.boolean().optional(),
  pickupAt: z.string().datetime(),
  contact: z.object({
    name: z.string().min(1).max(100),
    phone: z.string().min(1).max(40),
    email: z.string().email(),
  }),
  note: z.string().max(500).optional(),
  lines: z.array(lineSchema).min(1),
}).refine(
  (d) => d.payAtPickup || (d.sourceId && d.sourceId.length > 0),
  { message: "sourceId is required when not paying at pickup", path: ["sourceId"] },
);

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { status: "invalid_payload", field: "body", message: "Body is not valid JSON." },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        status: "invalid_payload",
        field: issue.path.join("."),
        message: issue.message,
      },
      { status: 400 }
    );
  }

  const result = await createOrderAndPayment(parsed.data);
  const httpStatus = result.status === "ok" ? 200 : 400;
  return NextResponse.json(result, { status: httpStatus });
}
