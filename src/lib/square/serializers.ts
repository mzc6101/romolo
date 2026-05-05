import type {
  SnapshotDiscount,
  SnapshotItem,
  SnapshotModifierList,
  SnapshotModifier,
  SnapshotPricingRule,
  SnapshotProductSet,
  SnapshotVariation,
} from "./types";

export function serializeDiscount(raw: any): SnapshotDiscount {
  const data = raw.discountData ?? {};
  const type = data.discountType ?? "FIXED_AMOUNT";
  const amount = data.amountMoney?.amount;
  const pct = data.percentage;
  return {
    id: raw.id,
    name: data.name ?? "",
    type,
    amountCents: amount != null ? Number(amount) : undefined,
    percentage: pct != null && pct !== "" ? Number(pct) : undefined,
  };
}

export function serializeProductSet(raw: any): SnapshotProductSet {
  const data = raw.productSetData ?? {};
  return {
    id: raw.id,
    productIdsAny: data.productIdsAny ?? undefined,
    productIdsAll: data.productIdsAll ?? undefined,
    allProducts: data.allProducts === true ? true : undefined,
    quantityMin: data.quantityMin != null ? Number(data.quantityMin) : undefined,
    quantityMax: data.quantityMax != null ? Number(data.quantityMax) : undefined,
    quantityExact: data.quantityExact != null ? Number(data.quantityExact) : undefined,
  };
}

export function serializePricingRule(raw: any): SnapshotPricingRule {
  const data = raw.pricingRuleData ?? {};
  return {
    id: raw.id,
    discountId: data.discountId,
    matchProductsId: data.matchProductsId ?? undefined,
    excludeProductsId: data.excludeProductsId ?? undefined,
    applicationMode:
      data.applicationMode === "MANUAL" ? "MANUAL" : "AUTOMATIC",
    discountTargetScope:
      data.discountTargetScope === "ORDER" ? "ORDER" : "LINE_ITEM",
    validFromDate: data.validFromDate ?? undefined,
    validUntilDate: data.validUntilDate ?? undefined,
    validFromLocalTime: data.validFromLocalTime ?? undefined,
    validUntilLocalTime: data.validUntilLocalTime ?? undefined,
  };
}

// Merges Square's two filling-type Cannoli items ("Cannoli Online - Ice Cream",
// "Cannoli Online - Ricotta") into a single composite frontend item ("Cannoli")
// with a `cannoliFillings` payload, and renames "Cannoli Online - Kit" to its
// display name. Square models filling type as separate items because modifier
// lists can't be scoped to specific variations — so the merge happens here on
// the frontend instead. Returns items in their original order; the composite
// takes the position of whichever underlying filling appears first.
//
// If only one of Ice Cream / Ricotta exists, no composite is produced — that
// filling stays as a normal item. Items not matching any of the three names
// pass through untouched.
export function mergeCannoliItems(
  items: SnapshotItem[],
  options: {
    iceCreamItemName: string;
    ricottaItemName: string;
    kitItemName: string;
    kitDisplayName: string;
    compositeName: string;
    compositeId: string;
  }
): SnapshotItem[] {
  const iceCream = items.find((i) => i.name === options.iceCreamItemName);
  const ricotta = items.find((i) => i.name === options.ricottaItemName);
  const kit = items.find((i) => i.name === options.kitItemName);
  const compositePossible = !!iceCream && !!ricotta;
  let compositeEmitted = false;

  const result: SnapshotItem[] = [];
  for (const item of items) {
    if (compositePossible && (item === iceCream || item === ricotta)) {
      if (!compositeEmitted) {
        result.push({
          id: options.compositeId,
          name: options.compositeName,
          description: undefined,
          categoryName: iceCream!.categoryName ?? ricotta!.categoryName,
          variations: [],
          modifierLists: [],
          cannoliFillings: [
            {
              key: "ice_cream",
              label: "Ice Cream",
              squareItemId: iceCream!.id,
              variations: iceCream!.variations,
              modifierLists: iceCream!.modifierLists,
            },
            {
              key: "ricotta",
              label: "Ricotta",
              squareItemId: ricotta!.id,
              variations: ricotta!.variations,
              modifierLists: ricotta!.modifierLists,
            },
          ],
        });
        compositeEmitted = true;
      }
      continue;
    }
    if (kit && item === kit) {
      result.push({ ...kit, name: options.kitDisplayName });
      continue;
    }
    result.push(item);
  }
  return result;
}

export function serializeModifier(raw: any): SnapshotModifier {
  const data = raw.modifierData ?? {};
  const amount = data.priceMoney?.amount;
  return {
    id: raw.id,
    name: data.name ?? "",
    priceCents: amount != null ? Number(amount) : 0,
  };
}

// Modifier list metadata is read directly from Square. We honor:
//   - modifier_type: "LIST" (default) | "TEXT" (free-text input)
//   - selection_type: "SINGLE" | "MULTIPLE"
//   - min_selected_modifiers / max_selected_modifiers (null = unset)
//   - text fields (max_length, text_required) for TEXT lists
// `min` and `max` can be overridden per-attachment via modifier_list_info on
// the item — that override is applied in serializeItem.
export function serializeModifierList(raw: any): SnapshotModifierList {
  const data = raw.modifierListData ?? {};
  const modifierType: "list" | "text" =
    data.modifierType === "TEXT" ? "text" : "list";
  const selectionType: "SINGLE" | "MULTIPLE" =
    data.selectionType === "MULTIPLE" ? "MULTIPLE" : "SINGLE";

  const rawMin = data.minSelectedModifiers;
  const rawMax = data.maxSelectedModifiers;
  const minSelected = rawMin != null ? Number(rawMin) : 0;
  const maxSelected = rawMax != null ? Number(rawMax) : null;

  if (modifierType === "text") {
    return {
      id: raw.id,
      name: data.name ?? "",
      modifierType,
      selectionType,
      minSelected: data.textRequired ? 1 : 0,
      maxSelected: 1,
      modifiers: [],
      maxLength:
        data.maxLength != null ? Number(data.maxLength) : undefined,
      textRequired: data.textRequired === true,
    };
  }

  return {
    id: raw.id,
    name: data.name ?? "",
    modifierType,
    selectionType,
    minSelected,
    maxSelected,
    modifiers: (data.modifiers ?? []).map(serializeModifier),
  };
}

export function serializeVariation(
  raw: any,
  stockByVariationId: Record<string, number>
): SnapshotVariation {
  const data = raw.itemVariationData ?? {};
  const amount = data.priceMoney?.amount;
  const trackInventory =
    data.trackInventory === true ||
    (Array.isArray(data.locationOverrides) &&
      data.locationOverrides.some((o: any) => o.trackInventory === true));

  let inStock = true;
  if (trackInventory) {
    const count = stockByVariationId[raw.id];
    inStock = count != null && count > 0;
  }

  return {
    id: raw.id,
    name: data.name ?? "",
    priceCents: amount != null ? Number(amount) : 0,
    inStock,
    // TODO(post-MVP): the modal is pickup-only for this milestone (delivery hidden
    // in Step 3), so every variation is treated as pickup-eligible. When delivery
    // is wired in, source this from the item-level "Pickup Enabled" Square setting.
    pickupEnabled: true,
  };
}

export function serializeItem(
  raw: any,
  categoryName: string | undefined,
  allModifierLists: SnapshotModifierList[],
  stockByVariationId: Record<string, number>
): SnapshotItem {
  const data = raw.itemData ?? {};
  const enabledInfos: any[] = (data.modifierListInfo ?? []).filter(
    (info: any) => info.enabled !== false
  );

  const modifierLists: SnapshotModifierList[] = [];
  for (const info of enabledInfos) {
    const base = allModifierLists.find((ml) => ml.id === info.modifierListId);
    if (!base) continue;
    // Per-attachment min/max override the list-level values when present.
    const overrideMin = info.minSelectedModifiers;
    const overrideMax = info.maxSelectedModifiers;
    modifierLists.push({
      ...base,
      minSelected: overrideMin != null ? Number(overrideMin) : base.minSelected,
      maxSelected: overrideMax != null ? Number(overrideMax) : base.maxSelected,
    });
  }

  return {
    id: raw.id,
    name: data.name ?? "",
    description: data.description ?? undefined,
    categoryName,
    variations: (data.variations ?? []).map((v: any) =>
      serializeVariation(v, stockByVariationId)
    ),
    modifierLists,
  };
}
