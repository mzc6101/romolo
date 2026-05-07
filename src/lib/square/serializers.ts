import type {
  AutoModifierRef,
  CannoliFilling,
  SetInfo,
  SetOption,
  SnapshotItem,
  SnapshotModifierList,
  SnapshotModifier,
  SnapshotVariation,
} from "./types";

// Merges Square's two filling-type Cannoli items ("Cannoli Online - Ice Cream",
// "Cannoli Online - Ricotta") into composite frontend items. Square models
// filling type as separate items because modifier lists can't be scoped to
// specific variations — so the merge happens here on the frontend instead.
//
// Up to three composites are emitted (in order, at the position of the
// first underlying filling):
//   1. "Cannoli" — full menu (both sizes, all modifier lists except the kit
//      modifier list, which is reserved for the kit composite).
//   2. "Cannoli Kit" — Full Size only, modifier lists minus Multiple Boxes
//      and minus the Kit modifier list (the kit fee is auto-applied at
//      submit, so the user shouldn't see the toggle). Tagged with KitInfo so
//      the frontend can drive qty stepping by groupSize and submit the
//      override.
//   3. "Cannoli Set" — fixed-recipe Ricotta build (Ricotta + Chocolate +
//      Mixed) sold in three sizes (6 Full / 12 Full / 24 Mini). Tagged with
//      SetInfo carrying the size options and auto-applied modifier ids.
//      Emitted only when all auto modifiers, both variations, and the
//      Special Notes list resolve on the Ricotta item.
//
// Reserved modifier options (e.g. the Mixed garnish) are stripped from the
// regular and kit composites so they only surface as the auto-applied set
// recipe, never as a user-selectable choice on other composites.
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
    setCompositeName: string;
    setCompositeId: string;
    setAutoModifiers: ReadonlyArray<{
      listNameSuffix: string;
      modifierName: string;
    }>;
    setOptionSpecs: ReadonlyArray<{
      key: string;
      label: string;
      variationPrefix: string;
      qty: number;
    }>;
    setReservedModifierNames: ReadonlySet<string>;
    specialNotesListNameSuffix: string;
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
        result.push(buildKitComposite(iceCream!, ricotta!, options));
        const setComposite = buildSetComposite(iceCream!, ricotta!, options);
        if (setComposite) result.push(setComposite);
        compositeEmitted = true;
      }
      continue;
    }
    result.push(item);
  }
  return result;
}

function buildRegularComposite(
  iceCream: SnapshotItem,
  ricotta: SnapshotItem,
  options: {
    compositeId: string;
    compositeName: string;
    kitModifierListName: string;
    setReservedModifierNames: ReadonlySet<string>;
  }
): SnapshotItem {
  const stripKit = (lists: SnapshotModifierList[]) =>
    lists.filter((ml) => ml.name !== options.kitModifierListName);
  const strip = (lists: SnapshotModifierList[]) =>
    stripReservedModifierOptions(stripKit(lists), options.setReservedModifierNames);
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
        modifierLists: strip(iceCream.modifierLists),
      },
      {
        key: "ricotta",
        label: "Ricotta",
        squareItemId: ricotta.id,
        variations: ricotta.variations,
        modifierLists: strip(ricotta.modifierLists),
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
    setReservedModifierNames: ReadonlySet<string>;
    kitGroupSize: number;
    perKitFeeCents: number;
  },
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
  const strip = (lists: SnapshotModifierList[]) =>
    stripReservedModifierOptions(
      stripKitAndBoxes(lists),
      options.setReservedModifierNames,
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
        modifierLists: strip(iceCream.modifierLists),
      },
      {
        key: "ricotta",
        label: "Ricotta",
        squareItemId: ricotta.id,
        variations: fullSizeOnly(ricotta.variations),
        modifierLists: strip(ricotta.modifierLists),
      },
    ],
    kit: {
      perKitFeeCents: options.perKitFeeCents,
      groupSize: options.kitGroupSize,
    },
  };
}

// Filters reserved modifier OPTIONS (not lists) out of every list. Used so
// set-only options like "Mixed" garnish never surface on the regular or kit
// composites, even though the underlying Garnish list itself stays visible
// for picking other garnishes (Sprinkles, Chocolate Chips, etc.).
function stripReservedModifierOptions(
  lists: SnapshotModifierList[],
  reserved: ReadonlySet<string>,
): SnapshotModifierList[] {
  if (reserved.size === 0) return lists;
  return lists.map((ml) =>
    ml.modifierType === "list"
      ? { ...ml, modifiers: ml.modifiers.filter((m) => !reserved.has(m.name)) }
      : ml,
  );
}

// Resolves the Cannoli Set composite from the Ricotta item. Returns null
// (no error) when any of the three auto modifiers, the Special Notes list,
// or one of the size variations can't be resolved on Ricotta — the rest of
// the menu keeps working and the operator gets a console warning.
//
// The Ice Cream item is consulted only for Customize-mode plumbing:
// `cannoliFillings` carries both Ricotta and Ice Cream branches, and each
// SetOption gets an optional `iceCream` variation ref. Missing Ice Cream
// data degrades Customize → Ice Cream gracefully (sizes without a matching
// Ice Cream variation are flagged out-of-stock for that filling) but never
// blocks the set composite from emitting.
function buildSetComposite(
  iceCream: SnapshotItem,
  ricotta: SnapshotItem,
  options: {
    setCompositeId: string;
    setCompositeName: string;
    setAutoModifiers: ReadonlyArray<{
      listNameSuffix: string;
      modifierName: string;
    }>;
    setOptionSpecs: ReadonlyArray<{
      key: string;
      label: string;
      variationPrefix: string;
      qty: number;
    }>;
    kitModifierListName: string;
    multipleBoxesModifierListName: string;
    specialNotesListNameSuffix: string;
  },
): SnapshotItem | null {
  const autoModifiers: AutoModifierRef[] = [];
  for (const spec of options.setAutoModifiers) {
    const list = ricotta.modifierLists.find(
      (ml) =>
        ml.modifierType === "list" &&
        ml.name.toLowerCase().trim().endsWith(spec.listNameSuffix),
    );
    if (!list) {
      console.warn(
        `[cannoli-set] Modifier list with suffix "${spec.listNameSuffix}" not found on Ricotta — skipping set composite.`,
      );
      return null;
    }
    const modifier = list.modifiers.find(
      (m) => m.name.toLowerCase().trim() === spec.modifierName.toLowerCase().trim(),
    );
    if (!modifier) {
      console.warn(
        `[cannoli-set] Modifier "${spec.modifierName}" not found in "${list.name}" — skipping set composite.`,
      );
      return null;
    }
    autoModifiers.push({
      modifierListId: list.id,
      modifierId: modifier.id,
      ...(modifier.soldOut ? { soldOut: true } : {}),
    });
  }

  const setOptions: SetOption[] = [];
  for (const spec of options.setOptionSpecs) {
    const variation = ricotta.variations.find((v) =>
      v.name.toLowerCase().trim().startsWith(spec.variationPrefix),
    );
    if (!variation) {
      console.warn(
        `[cannoli-set] Variation with prefix "${spec.variationPrefix}" not found on Ricotta — skipping set composite.`,
      );
      return null;
    }
    // Ice Cream equivalent — optional. Customize → Ice Cream uses this when
    // present; absent means the size is unavailable on Ice Cream.
    const iceCreamVariation = iceCream.variations.find((v) =>
      v.name.toLowerCase().trim().startsWith(spec.variationPrefix),
    );
    setOptions.push({
      key: spec.key,
      label: spec.label,
      variationId: variation.id,
      qty: spec.qty,
      priceCents: variation.priceCents,
      inStock: variation.inStock,
      ...(iceCreamVariation
        ? {
            iceCream: {
              variationId: iceCreamVariation.id,
              priceCents: iceCreamVariation.priceCents,
              inStock: iceCreamVariation.inStock,
            },
          }
        : {}),
    });
  }

  const specialNotesList = ricotta.modifierLists.find(
    (ml) =>
      ml.modifierType === "text" &&
      ml.name.toLowerCase().trim().endsWith(options.specialNotesListNameSuffix),
  );
  if (!specialNotesList) {
    console.warn(
      `[cannoli-set] Special Notes list with suffix "${options.specialNotesListNameSuffix}" not found on Ricotta — skipping set composite.`,
    );
    return null;
  }

  // Build per-filling modifier lists for Customize mode. Strip:
  //   - "Cannoli Multiple Boxes" — a set is one packaged unit.
  //   - "Cannoli Kit" — vestigial modifier reserved for the Kit composite.
  //   - any TEXT (Special Notes) list — the top-level Set Special Notes
  //     list already covers it; rendering it twice would confuse the user.
  // Mixed Garnish is intentionally NOT stripped here — it's the only
  // surface where customers can pick that option.
  const stripBoxesKitAndText = (lists: SnapshotModifierList[]) =>
    lists.filter(
      (ml) =>
        ml.name !== options.multipleBoxesModifierListName &&
        ml.name !== options.kitModifierListName &&
        ml.modifierType !== "text",
    );

  const cannoliFillings: CannoliFilling[] = [
    {
      key: "ice_cream",
      label: "Ice Cream",
      squareItemId: iceCream.id,
      variations: iceCream.variations,
      modifierLists: stripBoxesKitAndText(iceCream.modifierLists),
    },
    {
      key: "ricotta",
      label: "Ricotta",
      squareItemId: ricotta.id,
      variations: ricotta.variations,
      modifierLists: stripBoxesKitAndText(ricotta.modifierLists),
    },
  ];

  const set: SetInfo = { options: setOptions, autoModifiers };

  return {
    id: options.setCompositeId,
    name: options.setCompositeName,
    description: undefined,
    categoryName: ricotta.categoryName,
    variations: [],
    modifierLists: [specialNotesList],
    cannoliFillings,
    set,
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
