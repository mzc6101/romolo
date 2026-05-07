// Replicates the catalog code path without importing the server-only guarded module.
import { SquareClient, SquareEnvironment } from "square";
import {
  mergeCannoliItems,
  serializeItem,
  serializeModifierList,
} from "../src/lib/square/serializers";
import type { SnapshotItem } from "../src/lib/square/types";

const CANNOLI_CATEGORY_NAME = "Cannoli";
const CANNOLI_ICE_CREAM_NAME = "Cannoli Online - Ice Cream";
const CANNOLI_RICOTTA_NAME = "Cannoli Online - Ricotta";
const CANNOLI_ALLOWED_NAMES = new Set<string>([
  CANNOLI_ICE_CREAM_NAME,
  CANNOLI_RICOTTA_NAME,
]);
const CANNOLI_COMPOSITE_NAME = "Cannoli";
const CANNOLI_COMPOSITE_ID = "cannoli__composite";
const KIT_COMPOSITE_NAME = "Cannoli Kit";
const KIT_COMPOSITE_ID = "cannoli-kit__composite";
const KIT_MODIFIER_LIST_NAME = "Cannoli Kit";
const MULTIPLE_BOXES_MODIFIER_LIST_NAME = "Cannoli Multiple Boxes";
const KIT_GROUP_SIZE = 6;
const PER_KIT_FEE_CENTS = 200;
const SET_COMPOSITE_NAME = "Cannoli Set";
const SET_COMPOSITE_ID = "cannoli-set__composite";
const SET_AUTO_MODIFIERS = [
  { listNameSuffix: "filling", modifierName: "Original" },
  { listNameSuffix: "shell", modifierName: "Chocolate" },
  { listNameSuffix: "garnish", modifierName: "Mixed Garnish" },
] as const;
const SET_OPTION_SPECS = [
  { key: "6_full", label: "6 Full Size", variationPrefix: "full", qty: 6 },
  { key: "12_full", label: "12 Full Size", variationPrefix: "full", qty: 12 },
  { key: "24_mini", label: "24 Mini", variationPrefix: "mini", qty: 24 },
] as const;
const SET_RESERVED_MODIFIER_NAMES: ReadonlySet<string> = new Set([
  "Mixed Garnish",
]);
const SPECIAL_NOTES_LIST_NAME_SUFFIX = "special notes";

async function main() {
  const token = process.env.SQUARE_ACCESS_TOKEN!;
  const envName = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT;
  const locationId = process.env.SQUARE_LOCATION_ID!;
  const environment =
    envName === "production"
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox;
  const client = new SquareClient({ token, environment });

  const search = await client.catalog.search({
    objectTypes: [
      "ITEM",
      "CATEGORY",
      "DISCOUNT",
      "PRICING_RULE",
      "PRODUCT_SET",
    ],
    includeRelatedObjects: true,
  });
  const objects = search.objects ?? [];
  const related = search.relatedObjects ?? [];
  const allObjects = [...objects, ...related];

  const categoriesById = new Map<string, string>();
  for (const o of allObjects) {
    if (o.type === "CATEGORY") {
      categoriesById.set(o.id!, (o as any).categoryData?.name ?? "");
    }
  }
  const allModifierLists = allObjects
    .filter((o) => o.type === "MODIFIER_LIST")
    .map(serializeModifierList);

  const itemObjects = objects.filter((o) => o.type === "ITEM");
  const variationIds = itemObjects.flatMap(
    (i: any) =>
      (i.itemData?.variations ?? []).map((v: any) => v.id) as string[]
  );
  const stockByVariationId: Record<string, number> = {};
  if (variationIds.length > 0) {
    const page = await client.inventory.batchGetCounts({
      catalogObjectIds: variationIds,
      locationIds: [locationId],
    });
    for (const c of page.data ?? []) {
      if (c.catalogObjectId && c.quantity != null) {
        stockByVariationId[c.catalogObjectId] = Number(c.quantity);
      }
    }
  }

  const items: SnapshotItem[] = [];
  for (const raw of itemObjects) {
    const data = (raw as any).itemData ?? {};
    const categoryId: string | undefined =
      data.categoryId ?? data.categories?.[0]?.id;
    const categoryName = categoryId
      ? categoriesById.get(categoryId)
      : undefined;
    const skip =
      categoryName === CANNOLI_CATEGORY_NAME &&
      !CANNOLI_ALLOWED_NAMES.has(data.name);
    console.log(
      `[ingest] "${data.name}"  category=${categoryName ?? "-"}  ${skip ? "SKIP" : "KEEP"}`
    );
    if (skip) continue;
    items.push(
      serializeItem(raw, categoryName, allModifierLists, stockByVariationId)
    );
  }

  const merged = mergeCannoliItems(items, {
    iceCreamItemName: CANNOLI_ICE_CREAM_NAME,
    ricottaItemName: CANNOLI_RICOTTA_NAME,
    compositeName: CANNOLI_COMPOSITE_NAME,
    compositeId: CANNOLI_COMPOSITE_ID,
    kitCompositeName: KIT_COMPOSITE_NAME,
    kitCompositeId: KIT_COMPOSITE_ID,
    kitModifierListName: KIT_MODIFIER_LIST_NAME,
    multipleBoxesModifierListName: MULTIPLE_BOXES_MODIFIER_LIST_NAME,
    kitGroupSize: KIT_GROUP_SIZE,
    perKitFeeCents: PER_KIT_FEE_CENTS,
    setCompositeName: SET_COMPOSITE_NAME,
    setCompositeId: SET_COMPOSITE_ID,
    setAutoModifiers: SET_AUTO_MODIFIERS,
    setOptionSpecs: SET_OPTION_SPECS,
    setReservedModifierNames: SET_RESERVED_MODIFIER_NAMES,
    specialNotesListNameSuffix: SPECIAL_NOTES_LIST_NAME_SUFFIX,
  });

  console.log(`\n== After merge: ${merged.length} items ==\n`);
  for (const i of merged) {
    console.log(`- "${i.name}"  (id: ${i.id})`);
    if (i.cannoliFillings) {
      for (const f of i.cannoliFillings) {
        console.log(
          `    filling: ${f.label}  (squareItemId: ${f.squareItemId})`
        );
        console.log(
          `      variations: ${f.variations.map((v) => `${v.name} ($${(v.priceCents / 100).toFixed(2)})`).join(", ")}`
        );
        for (const ml of f.modifierLists) {
          const opts =
            ml.modifierType === "list"
              ? ` [${ml.modifiers.map((m) => m.name).join(", ")}]`
              : "";
          console.log(`      mod list: ${ml.name}${opts}`);
        }
      }
    } else if (i.set) {
      console.log(
        `    set options: ${i.set.options.map((o) => `${o.label} → ${o.variationId} × ${o.qty} (inStock=${o.inStock})`).join(" | ")}`
      );
      console.log(
        `    auto modifiers: ${i.set.autoModifiers.map((am) => `${am.modifierListId}=${am.modifierId}${am.soldOut ? " SOLD OUT" : ""}`).join(", ")}`
      );
      console.log(
        `    modifier lists: ${i.modifierLists.map((m) => m.name).join(", ") || "(none)"}`
      );
    } else {
      console.log(
        `    variations: ${i.variations.map((v) => `${v.name} ($${(v.priceCents / 100).toFixed(2)})`).join(", ")}`
      );
      console.log(
        `    modifier lists: ${i.modifierLists.map((m) => m.name).join(", ")}`
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
