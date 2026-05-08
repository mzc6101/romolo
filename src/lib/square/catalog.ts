import "server-only";
import { squareClient, squareLocationId } from "./client";
import {
  mergeCannoliItems,
  serializeItem,
  serializeModifierList,
  stripHiddenModifierOptions,
} from "./serializers";
import type { SnapshotItem, SnapshotModifierList } from "./types";

// Walks the raw Square objects and applies per-location sold-out flags onto
// the serialized snapshot. We post-process here (rather than threading the
// location id through every serializer) because:
//   - Variation in-stock signal is already location-scoped via inventory
//     counts; folding the dashboard sold-out toggle into `inStock` keeps the
//     UI logic uniform (one `inStock` boolean to render against).
//   - Modifier sold-out lives in ModifierLocationOverrides, which the
//     serializer doesn't see. Adding a `soldOut` flag to SnapshotModifier and
//     mutating in place propagates to every item that references the same
//     modifier (since serializeItem shares the modifiers array by reference).
//
// Triggered in production by the catalog.version.updated webhook (sold-out
// toggle in dashboard → catalog mutation → revalidateTag → next request
// rebuilds the snapshot through this path).
function applyLocationSoldOut(
  items: SnapshotItem[],
  allModifierLists: SnapshotModifierList[],
  rawItems: any[],
  rawModifierLists: any[],
  locationId: string
): void {
  const variationSoldOut = new Set<string>();
  for (const raw of rawItems) {
    for (const v of raw.itemData?.variations ?? []) {
      const overrides = v.itemVariationData?.locationOverrides ?? [];
      if (
        overrides.some(
          (o: any) => o.locationId === locationId && o.soldOut === true
        )
      ) {
        variationSoldOut.add(v.id);
      }
    }
  }

  const modifierSoldOut = new Set<string>();
  for (const raw of rawModifierLists) {
    for (const m of raw.modifierListData?.modifiers ?? []) {
      const overrides = m.modifierData?.locationOverrides ?? [];
      if (
        overrides.some(
          (o: any) => o.locationId === locationId && o.soldOut === true
        )
      ) {
        modifierSoldOut.add(m.id);
      }
    }
  }

  for (const item of items) {
    for (const v of item.variations) {
      if (variationSoldOut.has(v.id)) v.inStock = false;
    }
  }
  for (const ml of allModifierLists) {
    for (const m of ml.modifiers) {
      if (modifierSoldOut.has(m.id)) m.soldOut = true;
    }
  }
}

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

// Cannoli Set composite — fixed-recipe Ricotta build (Ricotta + Chocolate +
// Mixed) sold in three sizes. Auto modifiers are looked up by name from the
// Ricotta item's modifier lists at catalog-build time. Suffix matching on
// list names survives Square renames the same way modifierListRank does.
const SET_COMPOSITE_NAME = "Cannoli Set";
const SET_COMPOSITE_ID = "cannoli-set__composite";
// Auto-applied modifier OPTIONS, looked up by name from the Ricotta item's
// modifier lists. The Filling list ("Cannoli Ricotta Filling") picks the
// ricotta *flavor* — set lines default to "Original" plain ricotta. Shell
// and Garnish are also fixed.
const SET_AUTO_MODIFIERS = [
  { listNameSuffix: "filling", modifierName: "Original" },
  { listNameSuffix: "shell", modifierName: "Chocolate" },
  { listNameSuffix: "garnish", modifierName: "Mixed Garnish" },
] as const;
const SET_OPTION_SPECS = [
  { key: "6_full", label: "6 Full Size", variationPrefix: "full", qty: 6 },
  { key: "12_full", label: "12 Full Size", variationPrefix: "full", qty: 12 },
  { key: "12_mini", label: "12 Mini Size", variationPrefix: "mini", qty: 12 },
  { key: "24_mini", label: "24 Mini Size", variationPrefix: "mini", qty: 24 },
] as const;
// Modifier OPTION names that exist in Square but should NOT surface as user-
// pickable choices on the regular Cannoli or Cannoli Kit composites — they
// are reserved for set-only auto-application.
const SET_RESERVED_MODIFIER_NAMES: ReadonlySet<string> = new Set([
  "Mixed Garnish",
]);
const SPECIAL_NOTES_LIST_NAME_SUFFIX = "special notes";

// Modifier OPTION names that exist in Square but should NEVER surface in the
// online ordering UI, regardless of which item or list they appear on.
// Square uses "In-Store" as a default-on flag for staff-rung-up orders so the
// kitchen knows the customer will pick a flavor at the counter; it has no
// meaning for online checkout.
const HIDDEN_MODIFIER_OPTION_NAMES: ReadonlySet<string> = new Set([
  "In-Store",
]);

export async function getCatalog(): Promise<{ items: SnapshotItem[] }> {
  const client = squareClient();
  const locationId = squareLocationId();

  // Discount / pricing-rule / product-set objects aren't fetched anymore —
  // their evaluation lives in Square's calculate endpoint, which doesn't
  // need the catalog snapshot to know about them.
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

  applyLocationSoldOut(items, allModifierLists, itemObjects, modifierListsRaw, locationId);

  const cleanedItems = stripHiddenModifierOptions(items, HIDDEN_MODIFIER_OPTION_NAMES);

  const mergedItems = mergeCannoliItems(cleanedItems, {
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

  return { items: mergedItems };
}
