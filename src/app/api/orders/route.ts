import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrderAndPayment } from "@/lib/square/orders";

const lineSchema = z.object({
  catalogObjectId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  modifiers: z.array(z.string()),
  // Square line-item notes cap at 2000 chars; we cap a bit lower for safety.
  note: z.string().max(500).optional(),
  // Set when the line came from the Cannoli Kit composite. Server emits an
  // ad-hoc Square line item right after the cannoli line at this price ×
  // count, and optionally attaches the catalog kit modifier ($0) to the
  // cannoli line as a POS marker.
  kitModifier: z
    .object({
      perKitFeeCents: z.number().int().min(0).max(10_000),
      count: z.number().int().min(1).max(20),
      modifierId: z.string().min(1).optional(),
    })
    .optional(),
});

const bodySchema = z.object({
  idempotencyKey: z.string().min(1).max(64),
  sourceId: z.string().min(1),
  pickupAt: z.string().datetime(),
  contact: z.object({
    name: z.string().min(1).max(100),
    phone: z.string().min(1).max(40),
    email: z.string().email(),
  }),
  lines: z.array(lineSchema).min(1),
});

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
