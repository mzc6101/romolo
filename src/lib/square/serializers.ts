import type {
  SetInfo,
  SnapshotItem,
  SnapshotModifierList,
  SnapshotModifier,
  SnapshotVariation,
} from "./types";

// Merges Square's per-filling Cannoli items into composite frontend items.
// Three composites are emitted (in order, at the position of the first
// underlying source item):
//
//   1. "Cannoli" — full menu (both fillings, both sizes, all modifier lists
//      except the kit modifier list and Multiple Boxes).
//   2. "Cannoli Kit" — Full Size only, modifier lists minus Multiple Boxes
//      and minus the Kit modifier list (the kit fee is auto-applied at
//      submit, so the user shouldn't see the toggle). Tagged with KitInfo so
//      the frontend can drive qty stepping by groupSize and submit the
//      override.
//   3. "Cannoli Set" — passthrough of the "Cannoli Online - Set" Square item.
//      Variations are real (size options 6 Full / 12 Full / 12 Mini / 24
//      Mini); the filling-type chooser is a real Square modifier list ("Cannoli
//      Set Filling": Ricotta / Ice Cream). SetInfo carries the conditional-
//      visibility map (which lists show only for Ricotta vs Ice Cream) and the
//      default recipe (Ricotta + Original / Chocolate / Mixed Garnish) the
//      frontend pre-fills when a Set line is added.
//
// Composites 1 and 2 require BOTH the Ice Cream and Ricotta items. Composite
// 3 requires the new Set item plus its filling-type list — emitted independently
// from the others.
//
// Reserved modifier options (e.g. Mixed Garnish, Mixed Shell) are stripped
// from composites 1 and 2 so they only surface on the Set, never as a user
// pick on a non-set Cannoli line.
//
// If a source item is missing the corresponding composites are skipped; the
// rest of the menu still renders.
export function mergeCannoliItems(
  items: SnapshotItem[],
  options: {
    iceCreamItemName: string;
    ricottaItemName: string;
    setItemName: string;
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
    setFillingTypeListName: string;
    setRicottaOptionName: string;
    setIceCreamOptionName: string;
    // Suffix-matched against modifier list names on the Set item to classify
    // each list as ricotta-only or ice-cream-only. Lists matching neither
    // bucket (e.g. Multiple Boxes, Special Notes) render unconditionally.
    ricottaOnlyListSuffixes: ReadonlyArray<string>;
    iceCreamOnlyListSuffixes: ReadonlyArray<string>;
    // Default-recipe option names looked up by name in the Set item's
    // modifier lists. Each maps to a list-suffix → option-name pair.
    setDefaults: {
      ricottaFillingListSuffix: string;
      ricottaFillingOptionName: string;
      shellListSuffix: string;
      shellOptionName: string;
      garnishListSuffix: string;
      garnishOptionName: string;
    };
    setReservedModifierNames: ReadonlySet<string>;
  }
): SnapshotItem[] {
  const iceCream = items.find((i) => i.name === options.iceCreamItemName);
  const ricotta = items.find((i) => i.name === options.ricottaItemName);
  const setItem = items.find((i) => i.name === options.setItemName);

  const cannoliPossible = !!iceCream && !!ricotta;
  let cannoliEmitted = false;
  let setEmitted = false;
  const cannoliSetComposite = setItem ? buildSetComposite(setItem, options) : null;

  const result: SnapshotItem[] = [];
  for (const item of items) {
    if (cannoliPossible && (item === iceCream || item === ricotta)) {
      if (!cannoliEmitted) {
        result.push(buildRegularComposite(iceCream!, ricotta!, options));
        result.push(buildKitComposite(iceCream!, ricotta!, options));
        cannoliEmitted = true;
        // Slot the Set composite in next to its siblings when both groupings
        // would otherwise emit at different positions. Keeps the on-page
        // order Cannoli → Kit → Set, matching how the picker categorizes them.
        if (cannoliSetComposite && !setEmitted) {
          result.push(cannoliSetComposite);
          setEmitted = true;
        }
      }
      continue;
    }
    if (setItem && item === setItem) {
      if (cannoliSetComposite && !setEmitted) {
        result.push(cannoliSetComposite);
        setEmitted = true;
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
    multipleBoxesModifierListName: string;
    setReservedModifierNames: ReadonlySet<string>;
  }
): SnapshotItem {
  // Multiple Boxes is reserved for the Cannoli Set composite — set buyers
  // need it to package multiple sets. On the regular Cannoli a single line
  // is one box, so the list would only confuse the picker.
  const stripKitAndBoxes = (lists: SnapshotModifierList[]) =>
    lists.filter(
      (ml) =>
        ml.name !== options.kitModifierListName &&
        ml.name !== options.multipleBoxesModifierListName,
    );
  const strip = (lists: SnapshotModifierList[]) =>
    stripReservedModifierOptions(stripKitAndBoxes(lists), options.setReservedModifierNames);
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

// Strips modifier OPTION names that should never surface online (e.g.
// "In-Store") from every list on every item. Applied catalog-wide before
// composite merging so downstream code (cannoli composites, line-valid
// checks, summarize) all see a clean snapshot with no hidden options.
export function stripHiddenModifierOptions(
  items: SnapshotItem[],
  hidden: ReadonlySet<string>,
): SnapshotItem[] {
  if (hidden.size === 0) return items;
  return items.map((item) => ({
    ...item,
    modifierLists: stripReservedModifierOptions(item.modifierLists, hidden),
  }));
}

// Transforms the "Cannoli Online - Set" Square item into the Set composite.
// Returns null (and logs a warning) when the filling-type list ("Cannoli Set
// Filling") or its two options (Ricotta / Ice Cream) can't be resolved — the
// rest of the menu keeps working without the Set.
//
// Default-recipe lookups (Original filling, Chocolate shell, Mixed Garnish)
// degrade gracefully: if any can't be resolved by name, that default just
// isn't pre-filled. The Set composite still emits and the user picks
// manually.
//
// The Cannoli Ricotta Filling list is overridden to MULTIPLE + max=null on
// the Set composite specifically (the user has confirmed Square's saved
// per-attachment data is unreliable in sandbox; intent is multi-select with
// no cap on the Set, single-select on the regular Ricotta item which this
// transform doesn't touch).
function buildSetComposite(
  setItem: SnapshotItem,
  options: {
    setCompositeId: string;
    setCompositeName: string;
    setFillingTypeListName: string;
    setRicottaOptionName: string;
    setIceCreamOptionName: string;
    ricottaOnlyListSuffixes: ReadonlyArray<string>;
    iceCreamOnlyListSuffixes: ReadonlyArray<string>;
    setDefaults: {
      ricottaFillingListSuffix: string;
      ricottaFillingOptionName: string;
      shellListSuffix: string;
      shellOptionName: string;
      garnishListSuffix: string;
      garnishOptionName: string;
    };
  },
): SnapshotItem | null {
  const fillingTypeList = setItem.modifierLists.find(
    (ml) =>
      ml.modifierType === "list" && ml.name === options.setFillingTypeListName,
  );
  if (!fillingTypeList) {
    console.warn(
      `[cannoli-set] Filling-type list "${options.setFillingTypeListName}" not found on Set item — skipping set composite.`,
    );
    return null;
  }
  const norm = (s: string) => s.toLowerCase().trim();
  const ricottaModifier = fillingTypeList.modifiers.find(
    (m) => norm(m.name) === norm(options.setRicottaOptionName),
  );
  const iceCreamModifier = fillingTypeList.modifiers.find(
    (m) => norm(m.name) === norm(options.setIceCreamOptionName),
  );
  if (!ricottaModifier || !iceCreamModifier) {
    console.warn(
      `[cannoli-set] Filling-type options "${options.setRicottaOptionName}" / "${options.setIceCreamOptionName}" not both present in "${fillingTypeList.name}" — skipping set composite.`,
    );
    return null;
  }

  // Per-set list overrides (regular Cannoli composite reads its own
  // attachment of the same lists and is unaffected):
  //   1) Ricotta Filling list: SINGLE → MULTIPLE, maxSelected → null. The
  //      user has confirmed Square's saved per-attachment data is unreliable
  //      in sandbox; intent is multi-select with no cap on the Set.
  //   2) Conditionally-shown lists (Shell, Filling, Garnish for Ricotta;
  //      Ice Cream Flavor for Ice Cream): bump minSelected to 1. Square
  //      models them as optional, but visible ⇒ required in the UI per
  //      product decision. activeModifierLists hides the wrong-bucket list
  //      based on filling type, so the require-when-visible semantics come
  //      from the standard min-selected check in lineValid.
  const isConditionalListName = (lcName: string): boolean =>
    options.ricottaOnlyListSuffixes.some((s) => lcName.endsWith(s)) ||
    options.iceCreamOnlyListSuffixes.some((s) => lcName.endsWith(s));
  const overriddenLists = setItem.modifierLists.map((ml) => {
    if (ml.modifierType !== "list") return ml;
    const lcName = norm(ml.name);
    let next = ml;
    if (
      lcName.endsWith(options.setDefaults.ricottaFillingListSuffix) &&
      !lcName.includes("set filling") // don't override the filling-type list
    ) {
      next = { ...next, selectionType: "MULTIPLE" as const, maxSelected: null };
    }
    if (
      next.id !== fillingTypeList.id &&
      isConditionalListName(lcName) &&
      next.minSelected < 1
    ) {
      next = { ...next, minSelected: 1 };
    }
    return next;
  });

  const ricottaOnlyListIds: string[] = [];
  const iceCreamOnlyListIds: string[] = [];
  for (const ml of overriddenLists) {
    const lcName = norm(ml.name);
    // The filling-type list itself is universal — drives the conditional
    // logic, never hides itself.
    if (ml.id === fillingTypeList.id) continue;
    if (options.ricottaOnlyListSuffixes.some((s) => lcName.endsWith(s))) {
      ricottaOnlyListIds.push(ml.id);
      continue;
    }
    if (options.iceCreamOnlyListSuffixes.some((s) => lcName.endsWith(s))) {
      iceCreamOnlyListIds.push(ml.id);
    }
  }

  // Default selections: filling type = Ricotta, plus Original / Chocolate /
  // Mixed Garnish on the matching ricotta lists. Each lookup degrades
  // independently — a missing default just isn't pre-filled.
  const defaultSelections: Array<{ listId: string; modifierIds: string[] }> = [
    { listId: fillingTypeList.id, modifierIds: [ricottaModifier.id] },
  ];
  const defaultLookups: Array<{ suffix: string; option: string }> = [
    {
      suffix: options.setDefaults.ricottaFillingListSuffix,
      option: options.setDefaults.ricottaFillingOptionName,
    },
    {
      suffix: options.setDefaults.shellListSuffix,
      option: options.setDefaults.shellOptionName,
    },
    {
      suffix: options.setDefaults.garnishListSuffix,
      option: options.setDefaults.garnishOptionName,
    },
  ];
  for (const { suffix, option } of defaultLookups) {
    const list = overriddenLists.find(
      (ml) =>
        ml.modifierType === "list" &&
        ml.id !== fillingTypeList.id &&
        norm(ml.name).endsWith(suffix),
    );
    const modifier = list?.modifiers.find(
      (m) => norm(m.name) === norm(option),
    );
    if (list && modifier) {
      defaultSelections.push({
        listId: list.id,
        modifierIds: [modifier.id],
      });
    } else {
      console.warn(
        `[cannoli-set] Default "${option}" in list ending "${suffix}" not resolvable; skipping that pre-selection.`,
      );
    }
  }

  const set: SetInfo = {
    fillingTypeListId: fillingTypeList.id,
    ricottaModifierId: ricottaModifier.id,
    iceCreamModifierId: iceCreamModifier.id,
    ricottaOnlyListIds,
    iceCreamOnlyListIds,
    defaultSelections,
  };

  return {
    id: options.setCompositeId,
    name: options.setCompositeName,
    description: setItem.description,
    categoryName: setItem.categoryName,
    variations: setItem.variations,
    modifierLists: overriddenLists,
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
