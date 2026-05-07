import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateOrderTotals } from "@/lib/square/calculate";

// Mirrors the line schema in /api/orders/route.ts but without the
// payment-specific fields (idempotencyKey, sourceId, contact, pickupAt).
// Calculate is a no-side-effect preview endpoint — Square charges nothing
// and stores nothing. Used by OrderSummary to keep the displayed total
// aligned with what the place-order request will be charged.
const lineSchema = z.object({
  catalogObjectId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  modifiers: z.array(z.string()),
  note: z.string().max(500).optional(),
  kitModifier: z
    .object({
      perKitFeeCents: z.number().int().min(0).max(10_000),
      count: z.number().int().min(1).max(20),
    })
    .optional(),
});

const bodySchema = z.object({
  lines: z.array(lineSchema).min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { status: "invalid_payload", field: "body", message: "Body is not valid JSON." },
      { status: 400 },
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
      { status: 400 },
    );
  }

  const result = await calculateOrderTotals(parsed.data);
  const httpStatus = result.status === "ok" ? 200 : 400;
  return NextResponse.json(result, { status: httpStatus });
}
