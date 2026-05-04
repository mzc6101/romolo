import type {
  SnapshotItem,
  SnapshotModifierList,
  SnapshotModifier,
  SnapshotVariation,
} from "./types";

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
