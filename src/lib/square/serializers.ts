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

// Splits a Square item whose variations follow "<form-factor> - <size>" naming
// (e.g. "Cannoli Online" with Full Size/Mini Size/Kit variations) into one
// SnapshotItem per form-factor. Variation IDs are preserved so they still
// resolve as catalog_object_id at order time. Variation names are trimmed to
// the size portion only ("Set of 6", "Single", etc.).
//
// `nameOverrides` lets callers map a form-factor to a custom display name —
// e.g. { "Kit": "Cannoli Kit" } — falling back to "<form> <baseName>".
// Returns the original item unchanged if no variation parses.
export function splitItemByFormFactor(
  item: SnapshotItem,
  nameOverrides?: Record<string, string>
): SnapshotItem[] {
  const order: string[] = [];
  const groups = new Map<string, SnapshotVariation[]>();
  let unparsed = false;
  for (const v of item.variations) {
    const m = v.name.match(/^\s*(.+?)\s+-\s+(.+?)\s*$/);
    if (!m) {
      unparsed = true;
      break;
    }
    const form = m[1];
    const size = m[2];
    if (!groups.has(form)) {
      groups.set(form, []);
      order.push(form);
    }
    groups.get(form)!.push({ ...v, name: size });
  }
  if (unparsed || groups.size === 0) return [item];

  return order.map((form) => ({
    id: `${item.id}__${form.replace(/\s+/g, "_").toLowerCase()}`,
    name: nameOverrides?.[form] ?? `${form} ${item.name}`,
    description: item.description,
    categoryName: item.categoryName,
    variations: groups.get(form)!,
    modifierLists: item.modifierLists,
  }));
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
