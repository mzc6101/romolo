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
// "Cannoli Online - Ricotta") into composite frontend items. Square models
// filling type as separate items because modifier lists can't be scoped to
// specific variations — so the merge happens here on the frontend instead.
//
// Two composites are emitted (in order, at the position of the first
// underlying filling):
//   1. "Cannoli" — full menu (both sizes, all modifier lists except the kit
//      modifier list, which is reserved for the kit composite).
//   2. "Cannoli Kit" — Full Size only, modifier lists minus Multiple Boxes
//      and minus the Kit modifier list (the kit fee is auto-applied at
//      submit, so the user shouldn't see the toggle). Tagged with KitInfo so
//      the frontend can drive qty stepping by groupSize and submit the
//      override.
//
// If only one filling exists, no composite is produced — that filling passes
// through untouched. Items not matching either name pass through untouched.
export function mergeCannoliItems(
  items: SnapshotItem[],
  options: {
    iceCreamItemName: string;
    ricottaItemName: string;
    compositeName: string;
    compositeId: string;
    kitCompositeName: string;
    kitCompositeId: string;
    kitModifierListName: string;
    multipleBoxesModifierListName: string;
    kitGroupSize: number;
    perKitFeeCents: number;
  }
): SnapshotItem[] {
  const iceCream = items.find((i) => i.name === options.iceCreamItemName);
  const ricotta = items.find((i) => i.name === options.ricottaItemName);
  const compositePossible = !!iceCream && !!ricotta;
  let compositeEmitted = false;

  const result: SnapshotItem[] = [];
  for (const item of items) {
    if (compositePossible && (item === iceCream || item === ricotta)) {
      if (!compositeEmitted) {
        result.push(buildRegularComposite(iceCream!, ricotta!, options));
        result.push(
          buildKitComposite(
            iceCream!,
            ricotta!,
            options,
            resolveKitInfo(iceCream!, ricotta!, options),
          ),
        );
        compositeEmitted = true;
      }
      continue;
    }
    result.push(item);
  }
  return result;
}

function resolveKitInfo(
  iceCream: SnapshotItem,
  ricotta: SnapshotItem,
  options: {
    kitModifierListName: string;
    kitGroupSize: number;
    perKitFeeCents: number;
  }
): { perKitFeeCents: number; groupSize: number; modifierId?: string } {
  // The Cannoli Kit modifier is decorative — fee is applied via an ad-hoc
  // line at submit. We look up its ID anyway so the order route can attach
  // it to the cannoli line as a $0 POS marker. Tolerate it being absent
  // (user may delete it on Square at any time without breaking kit orders).
  const list =
    iceCream.modifierLists.find((ml) => ml.name === options.kitModifierListName) ??
    ricotta.modifierLists.find((ml) => ml.name === options.kitModifierListName);
  const modifierId = list?.modifiers[0]?.id;
  return {
    perKitFeeCents: options.perKitFeeCents,
    groupSize: options.kitGroupSize,
    ...(modifierId ? { modifierId } : {}),
  };
}

function buildRegularComposite(
  iceCream: SnapshotItem,
  ricotta: SnapshotItem,
  options: {
    compositeId: string;
    compositeName: string;
    kitModifierListName: string;
  }
): SnapshotItem {
  const stripKit = (lists: SnapshotModifierList[]) =>
    lists.filter((ml) => ml.name !== options.kitModifierListName);
  return {
    id: options.compositeId,
    name: options.compositeName,
    description: undefined,
    categoryName: iceCream.categoryName ?? ricotta.categoryName,
    variations: [],
    modifierLists: [],
    cannoliFillings: [
      {
        key: "ice_cream",
        label: "Ice Cream",
        squareItemId: iceCream.id,
        variations: iceCream.variations,
        modifierLists: stripKit(iceCream.modifierLists),
      },
      {
        key: "ricotta",
        label: "Ricotta",
        squareItemId: ricotta.id,
        variations: ricotta.variations,
        modifierLists: stripKit(ricotta.modifierLists),
      },
    ],
  };
}

function buildKitComposite(
  iceCream: SnapshotItem,
  ricotta: SnapshotItem,
  options: {
    kitCompositeId: string;
    kitCompositeName: string;
    kitModifierListName: string;
    multipleBoxesModifierListName: string;
  },
  kitInfo: {
    perKitFeeCents: number;
    groupSize: number;
    modifierId?: string;
  }
): SnapshotItem {
  // Only Full Size cannolis qualify for the kit; Mini is hidden so the user
  // can't pick an ineligible size. Match by lowercased prefix so renames like
  // "Full Size" / "Full Size - Single" both keep working.
  const fullSizeOnly = (vs: SnapshotItem["variations"]) =>
    vs.filter((v) => v.name.toLowerCase().startsWith("full"));
  // Multiple Boxes is removed because each kit *is* a box. The kit modifier
  // list itself is removed because the fee auto-applies — surfacing the
  // toggle would let users untick it and short the store $2.
  const stripKitAndBoxes = (lists: SnapshotModifierList[]) =>
    lists.filter(
      (ml) =>
        ml.name !== options.kitModifierListName &&
        ml.name !== options.multipleBoxesModifierListName
    );
  return {
    id: options.kitCompositeId,
    name: options.kitCompositeName,
    description: undefined,
    categoryName: iceCream.categoryName ?? ricotta.categoryName,
    variations: [],
    modifierLists: [],
    cannoliFillings: [
      {
        key: "ice_cream",
        label: "Ice Cream",
        squareItemId: iceCream.id,
        variations: fullSizeOnly(iceCream.variations),
        modifierLists: stripKitAndBoxes(iceCream.modifierLists),
      },
      {
        key: "ricotta",
        label: "Ricotta",
        squareItemId: ricotta.id,
        variations: fullSizeOnly(ricotta.variations),
        modifierLists: stripKitAndBoxes(ricotta.modifierLists),
      },
    ],
    kit: kitInfo,
  };
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

  // Square uses -1 as the "unset / no override" sentinel for these fields, so
  // anything negative collapses to defaults (min=0, max=unlimited). Same
  // convention applies to the per-attachment override in serializeItem.
  const rawMin = data.minSelectedModifiers;
  const rawMax = data.maxSelectedModifiers;
  const minSelected =
    rawMin != null && Number(rawMin) >= 0 ? Number(rawMin) : 0;
  const maxSelected =
    rawMax != null && Number(rawMax) >= 0 ? Number(rawMax) : null;

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
    // Per-attachment min/max override the list-level values when set to a
    // non-negative integer. Square sends -1 to mean "no override" (and that
    // sentinel is also used to clear a previously-set override) — treating
    // -1 as a real cap would block every selection.
    const overrideMin = info.minSelectedModifiers;
    const overrideMax = info.maxSelectedModifiers;
    const useOverrideMin = overrideMin != null && Number(overrideMin) >= 0;
    const useOverrideMax = overrideMax != null && Number(overrideMax) >= 0;
    modifierLists.push({
      ...base,
      minSelected: useOverrideMin ? Number(overrideMin) : base.minSelected,
      maxSelected: useOverrideMax ? Number(overrideMax) : base.maxSelected,
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
