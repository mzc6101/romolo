import { SquareClient, SquareEnvironment } from "square";

const token = process.env.SQUARE_ACCESS_TOKEN;
const envName = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT;
const environment =
  envName === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox;

const client = new SquareClient({ token, environment });

const search = await client.catalog.search({
  objectTypes: ["ITEM", "CATEGORY", "MODIFIER_LIST"],
  includeRelatedObjects: true,
});

const objects = search.objects ?? [];
const related = search.relatedObjects ?? [];
const all = [...objects, ...related];

const categoriesById = new Map();
for (const o of all) {
  if (o.type === "CATEGORY") {
    categoriesById.set(o.id, o.categoryData?.name ?? "");
  }
}

const modifierListsById = new Map();
for (const o of all) {
  if (o.type === "MODIFIER_LIST") {
    modifierListsById.set(o.id, o.modifierListData?.name ?? "");
  }
}

console.log(`\n== Categories (${categoriesById.size}) ==`);
for (const [id, name] of categoriesById) {
  console.log(`  ${name}  (${id})`);
}

console.log(`\n== Items in 'Cannoli' category ==`);
const items = objects.filter((o) => o.type === "ITEM");
for (const i of items) {
  const data = i.itemData ?? {};
  const categoryId = data.categoryId ?? data.categories?.[0]?.id;
  const categoryName = categoryId ? categoriesById.get(categoryId) : "(none)";
  if (categoryName !== "Cannoli") continue;

  console.log(`\n  ITEM: "${data.name}"  (id: ${i.id})`);
  console.log(`    category: ${categoryName}`);
  console.log(`    variations:`);
  for (const v of data.variations ?? []) {
    const vd = v.itemVariationData ?? {};
    const price = vd.priceMoney?.amount;
    console.log(
      `      - "${vd.name}"  (id: ${v.id})  price: ${price ?? "n/a"}`
    );
  }
  console.log(`    modifier lists:`);
  for (const info of data.modifierListInfo ?? []) {
    const name = modifierListsById.get(info.modifierListId) ?? "(unknown)";
    console.log(
      `      - "${name}"  (id: ${info.modifierListId})  enabled: ${info.enabled !== false}  min: ${info.minSelectedModifiers ?? "-"}  max: ${info.maxSelectedModifiers ?? "-"}`
    );
  }
}

console.log(`\n== All ITEM names (any category) ==`);
for (const i of items) {
  const data = i.itemData ?? {};
  const categoryId = data.categoryId ?? data.categories?.[0]?.id;
  const categoryName = categoryId ? categoriesById.get(categoryId) : "(none)";
  console.log(`  "${data.name}"  [${categoryName}]`);
}
