import "server-only";
import { squareClient, squareLocationId } from "./client";
import {
  mergeCannoliItems,
  serializeDiscount,
  serializeItem,
  serializeModifierList,
  serializePricingRule,
  serializeProductSet,
} from "./serializers";
import type {
  SnapshotDiscount,
  SnapshotItem,
  SnapshotPricingRule,
  SnapshotProductSet,
} from "./types";

// Square models the two filling types as separate items so each can own its
// own modifier lists (Square modifier lists don't scope to specific
// variations). The frontend re-merges them into composite "Cannoli" and
// "Cannoli Kit" items with a filling-type picker — see mergeCannoliItems.
//
// The Square Cannoli category also contains legacy items ("Cannoli",
// "Cannoli Kit (Per 6)", etc.) that aren't part of the online flow. Items in
// CANNOLI_CATEGORY_NAME are dropped unless their name is in
// CANNOLI_ALLOWED_NAMES — i.e. the Cannoli category is opt-in.
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
// Modifier list names used to find the kit modifier (so its fee can be
// applied at submit) and the Multiple Boxes list (hidden on kit lines).
const KIT_MODIFIER_LIST_NAME = "Cannoli Kit";
const MULTIPLE_BOXES_MODIFIER_LIST_NAME = "Cannoli Multiple Boxes";
// One kit per six full-size cannolis at $2 per kit.
const KIT_GROUP_SIZE = 6;
const PER_KIT_FEE_CENTS = 200;

export async function getCatalog(): Promise<{
  items: SnapshotItem[];
  discounts: SnapshotDiscount[];
  pricingRules: SnapshotPricingRule[];
  productSets: SnapshotProductSet[];
}> {
  const client = squareClient();
  const locationId = squareLocationId();

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

  const modifierListsRaw = allObjects.filter(
    (o) => o.type === "MODIFIER_LIST"
  );
  const allModifierLists = modifierListsRaw.map(serializeModifierList);

  const itemObjects = objects.filter((o) => o.type === "ITEM");

  const variationIds = itemObjects.flatMap(
    (i: any) =>
      (i.itemData?.variations ?? []).map((v: any) => v.id) as string[]
  );

  const stockByVariationId: Record<string, number> = {};
  if (variationIds.length > 0) {
    // batchGetCounts returns a Page<InventoryCount>; first page is exposed as `.data`.
    // For our small catalog (~10s of variations) one page is plenty.
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

    if (
      categoryName === CANNOLI_CATEGORY_NAME &&
      !CANNOLI_ALLOWED_NAMES.has(data.name)
    ) {
      continue;
    }

    items.push(
      serializeItem(raw, categoryName, allModifierLists, stockByVariationId)
    );
  }

  const mergedItems = mergeCannoliItems(items, {
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
  });

  const discounts = allObjects
    .filter((o) => o.type === "DISCOUNT")
    .map(serializeDiscount);
  const pricingRules = allObjects
    .filter((o) => o.type === "PRICING_RULE")
    .map(serializePricingRule);
  const productSets = allObjects
    .filter((o) => o.type === "PRODUCT_SET")
    .map(serializeProductSet);

  return { items: mergedItems, discounts, pricingRules, productSets };
}
