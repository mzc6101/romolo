import type {
  SnapshotItem,
  SnapshotModifierList,
  SnapshotModifier,
  SnapshotVariation,
} from "./types";

export function isCannoliCategory(name?: string): boolean {
  if (!name) return false;
  return name.toLowerCase().includes("cannoli");
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

// NOTE: We currently derive min/max selection counts from `selectionType` only.
// Square's modern API exposes `minSelectedModifiers` / `maxSelectedModifiers`
// at both the modifier list and the per-item attachment (`modifierListInfo`),
// which override the list-level values. We intentionally ignore those for the
// Sandbox MVP — adding precise constraints (e.g. "must pick at least 2 of 5
// toppings") is deferred until a real merchant catalog needs it.
export function serializeModifierList(raw: any): SnapshotModifierList {
  const data = raw.modifierListData ?? {};
  const selectionType: "SINGLE" | "MULTIPLE" =
    data.selectionType === "MULTIPLE" ? "MULTIPLE" : "SINGLE";
  const minSelected = selectionType === "SINGLE" ? 1 : 0;
  const maxSelected = selectionType === "SINGLE" ? 1 : null;

  return {
    id: raw.id,
    name: data.name ?? "",
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
  const attachedListIds: string[] = (data.modifierListInfo ?? [])
    .filter((info: any) => info.enabled !== false)
    .map((info: any) => info.modifierListId);

  const modifierLists = allModifierLists.filter((ml) =>
    attachedListIds.includes(ml.id)
  );

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
