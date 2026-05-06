import { SquareClient, SquareEnvironment } from "square";
const token = process.env.SQUARE_ACCESS_TOKEN;
const envName = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT;
const environment =
  envName === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox;
const client = new SquareClient({ token, environment });

const search = await client.catalog.search({
  objectTypes: ["MODIFIER_LIST"],
  includeRelatedObjects: false,
});
const lists = search.objects ?? [];
for (const obj of lists) {
  const ml = obj.modifierListData ?? {};
  if (ml.name !== "Cannoli Kit") continue;
  console.log("id:", obj.id);
  console.log("name:", ml.name);
  console.log("modifierType:", ml.modifierType);
  console.log("selectionType:", ml.selectionType);
  console.log("min:", ml.minSelectedModifiers);
  console.log("max:", ml.maxSelectedModifiers);
  console.log("modifiers:");
  for (const m of ml.modifiers ?? []) {
    const md = m.modifierData ?? {};
    console.log(
      `  - "${md.name}"  $${(Number(md.priceMoney?.amount ?? 0) / 100).toFixed(2)}  id=${m.id}`
    );
  }
}
