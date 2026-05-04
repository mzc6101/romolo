import "server-only";
import { squareClient, squareLocationId } from "./client";
import {
  isCannoliCategory,
  serializeItem,
  serializeModifierList,
} from "./serializers";
import type { SnapshotItem } from "./types";

export async function getCatalog(): Promise<{
  items: SnapshotItem[];
}> {
  const client = squareClient();
  const locationId = squareLocationId();

  const search = await client.catalog.search({
    objectTypes: ["ITEM", "CATEGORY"],
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

    if (isCannoliCategory(categoryName)) continue; // out of scope

    items.push(
      serializeItem(raw, categoryName, allModifierLists, stockByVariationId)
    );
  }

  return { items };
}
