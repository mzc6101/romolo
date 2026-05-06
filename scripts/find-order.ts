import { SquareClient, SquareEnvironment } from "square";

const TARGET_EMAIL = process.argv[2] ?? "ateo19087@gmail.com";

const token = process.env.SQUARE_ACCESS_TOKEN!;
const locationId = process.env.SQUARE_LOCATION_ID!;
const envName = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT;
const environment =
  envName === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;
const client = new SquareClient({ token, environment });

async function main() {
  // Search the last 24h for OPEN/COMPLETED orders at this location.
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const search = await client.orders.search({
    locationIds: [locationId],
    query: {
      filter: {
        dateTimeFilter: { createdAt: { startAt: since } },
        stateFilter: { states: ["OPEN", "COMPLETED"] },
      },
      sort: { sortField: "CREATED_AT", sortOrder: "DESC" },
    },
    limit: 50,
  });

  const orders = search.orders ?? [];
  let match: any = null;
  for (const o of orders) {
    const ful = o.fulfillments?.[0];
    const email = ful?.pickupDetails?.recipient?.emailAddress;
    if (email === TARGET_EMAIL) {
      match = o;
      break;
    }
  }
  if (!match) {
    console.log(
      `No order matching ${TARGET_EMAIL} in the last 24h. Checked ${orders.length} orders. Most recent emails:`
    );
    for (const o of orders.slice(0, 5)) {
      const ful = o.fulfillments?.[0];
      console.log(
        `  - ${o.id?.slice(0, 8)}  ${ful?.pickupDetails?.recipient?.emailAddress ?? "(no email)"}  ${o.createdAt}`
      );
    }
    return;
  }

  const ful = match.fulfillments?.[0];
  const recipient = ful?.pickupDetails?.recipient;
  console.log("\n===== ORDER =====");
  console.log(`id:          ${match.id}`);
  console.log(`state:       ${match.state}`);
  console.log(`createdAt:   ${match.createdAt}`);
  console.log(`updatedAt:   ${match.updatedAt}`);
  console.log(`location:    ${match.locationId}`);
  console.log(
    `total:       ${(Number(match.totalMoney?.amount ?? 0) / 100).toFixed(2)} ${match.totalMoney?.currency}`
  );
  console.log(
    `subtotal:    ${(((Number(match.totalMoney?.amount ?? 0) + Number(match.totalDiscountMoney?.amount ?? 0)) / 100)).toFixed(2)}`
  );
  console.log(
    `discount:    -${(Number(match.totalDiscountMoney?.amount ?? 0) / 100).toFixed(2)}`
  );
  console.log(
    `tax:          ${(Number(match.totalTaxMoney?.amount ?? 0) / 100).toFixed(2)}`
  );
  console.log(`\nRECIPIENT:`);
  console.log(`  name:    ${recipient?.displayName}`);
  console.log(`  email:   ${recipient?.emailAddress}`);
  console.log(`  phone:   ${recipient?.phoneNumber}`);
  console.log(`  pickup:  ${ful?.pickupDetails?.pickupAt}`);
  console.log(`\nLINE ITEMS:`);
  for (const li of match.lineItems ?? []) {
    console.log(
      `  - ${li.quantity} × ${li.name} (${li.variationName ?? "-"})  $${(Number(li.totalMoney?.amount ?? 0) / 100).toFixed(2)}`
    );
    for (const m of li.modifiers ?? []) {
      console.log(
        `      + ${m.name}${m.totalPriceMoney?.amount ? `  +$${(Number(m.totalPriceMoney.amount) / 100).toFixed(2)}` : ""}`
      );
    }
    if (li.note) console.log(`      note: ${li.note}`);
  }
  console.log(`\nDISCOUNTS APPLIED:`);
  for (const d of match.discounts ?? []) {
    console.log(
      `  - ${d.name}  -$${(Number(d.appliedMoney?.amount ?? 0) / 100).toFixed(2)}  (${d.type})`
    );
  }

  const dashHost =
    environment === SquareEnvironment.Production
      ? "app.squareup.com"
      : "app.squareupsandbox.com";
  console.log(`\nDashboard URL:`);
  console.log(`  https://${dashHost}/dashboard/orders/overview/${match.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
