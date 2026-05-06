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
const all = [...(search.objects ?? []), ...(search.relatedObjects ?? [])];
const catById = new Map();
const mlById = new Map();
for (const o of all) {
  if (o.type === "CATEGORY") catById.set(o.id, o.categoryData?.name ?? "");
  if (o.type === "MODIFIER_LIST") mlById.set(o.id, o);
}
for (const i of search.objects ?? []) {
  if (i.type !== "ITEM") continue;
  const data = i.itemData ?? {};
  const catId = data.categoryId ?? data.categories?.[0]?.id;
  const catName = catId ? catById.get(catId) : "(none)";
  if (catName !== "Cookie") continue;
  console.log(`ITEM "${data.name}" (${i.id}) [${catName}]`);
  for (const info of data.modifierListInfo ?? []) {
    const ml = mlById.get(info.modifierListId);
    const mlName = ml?.modifierListData?.name ?? "(unknown)";
    const baseMin = ml?.modifierListData?.minSelectedModifiers;
    const baseMax = ml?.modifierListData?.maxSelectedModifiers;
    const baseSel = ml?.modifierListData?.selectionType;
    console.log(
      `  - "${mlName}" attach min:${info.minSelectedModifiers} max:${info.maxSelectedModifiers} | base min:${baseMin} max:${baseMax} sel:${baseSel}`
    );
  }
}
