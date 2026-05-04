import "server-only";
import { squareClient, squareLocationId } from "./client";
import {
  serializeDiscount,
  serializeItem,
  serializeModifierList,
  serializePricingRule,
  serializeProductSet,
  splitItemByFormFactor,
} from "./serializers";
import type {
  SnapshotDiscount,
  SnapshotItem,
  SnapshotPricingRule,
  SnapshotProductSet,
} from "./types";

// Square models cannoli as one item ("Cannoli Online") with 7 variations
// across Full Size / Mini Size / Kit form-factors. The frontend treats each
// form-factor as its own item, so we split on ingest. Display names below
// override the default "<form> <baseName>" label.
//
// The Square Cannoli category also contains other items (e.g. "Cannoli",
// "Cannoli Kit (Per 6)", legacy size SKUs) that aren't part of the online
// flow. Items in CANNOLI_CATEGORY_NAME are dropped unless they match
// CANNOLI_ITEM_NAME exactly — i.e. the Cannoli category is opt-in.
const CANNOLI_CATEGORY_NAME = "Cannoli";
const CANNOLI_ITEM_NAME = "Cannoli Online";
const CANNOLI_FORM_NAMES: Record<string, string> = {
  "Full Size": "Full Size Cannoli",
  "Mini Size": "Mini Size Cannoli",
  "Kit": "Cannoli Kit",
};

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
      data.name !== CANNOLI_ITEM_NAME
    ) {
      continue;
    }

    const serialized = serializeItem(
      raw,
      categoryName,
      allModifierLists,
      stockByVariationId
    );
    if (serialized.name === CANNOLI_ITEM_NAME) {
      items.push(...splitItemByFormFactor(serialized, CANNOLI_FORM_NAMES));
    } else {
      items.push(serialized);
    }
  }

  const discounts = allObjects
    .filter((o) => o.type === "DISCOUNT")
    .map(serializeDiscount);
  const pricingRules = allObjects
    .filter((o) => o.type === "PRICING_RULE")
    .map(serializePricingRule);
  const productSets = allObjects
    .filter((o) => o.type === "PRODUCT_SET")
    .map(serializeProductSet);

  return { items, discounts, pricingRules, productSets };
}
