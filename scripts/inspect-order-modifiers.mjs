import { SquareClient, SquareEnvironment } from "square";

const orderId = process.argv[2];
if (!orderId) {
  console.error("usage: inspect-order-modifiers.mjs <orderId>");
  process.exit(1);
}

const token = process.env.SQUARE_ACCESS_TOKEN;
const envName = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT;
const environment =
  envName === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox;
const client = new SquareClient({ token, environment });

const r = await client.orders.batchGet({ orderIds: [orderId] });
const o = (r.orders ?? [])[0];
if (!o) {
  console.error("not found");
  process.exit(1);
}
for (const li of o.lineItems ?? []) {
  console.log(`\nline qty=${li.quantity}  ${li.name} (${li.variationName ?? "-"})`);
  console.log(
    `  base price: $${(Number(li.basePriceMoney?.amount ?? 0) / 100).toFixed(2)}`
  );
  for (const m of li.modifiers ?? []) {
    console.log(
      `  modifier "${m.name}"  qty=${m.quantity ?? "(unset)"}  basePrice=$${(Number(m.basePriceMoney?.amount ?? 0) / 100).toFixed(2)}  totalPrice=$${(Number(m.totalPriceMoney?.amount ?? 0) / 100).toFixed(2)}`
    );
    console.log(`    raw: ${JSON.stringify(m, (_k, v) => typeof v === "bigint" ? v.toString() : v)}`);
  }
}
