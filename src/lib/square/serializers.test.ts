import { describe, it, expect } from "vitest";
import {
  mergeCannoliItems,
  serializeItem,
  serializeModifierList,
} from "./serializers";
import type {
  SnapshotItem,
  SnapshotModifierList,
} from "./types";

describe("serializeModifierList", () => {
  it("maps a SINGLE-select Square modifier list with explicit min", () => {
    const result = serializeModifierList(
      {
        type: "MODIFIER_LIST",
        id: "ML1",
        modifierListData: {
          name: "Cookie Flavors",
          selectionType: "SINGLE",
          minSelectedModifiers: 1,
          maxSelectedModifiers: 1,
          modifiers: [
            {
              type: "MODIFIER",
              id: "M1",
              modifierData: {
                name: "Amaretti",
                priceMoney: { amount: BigInt(0), currency: "USD" },
              },
            },
          ],
        },
      } as any
    );

    expect(result).toEqual({
      id: "ML1",
      name: "Cookie Flavors",
      modifierType: "list",
      selectionType: "SINGLE",
      minSelected: 1,
      maxSelected: 1,
      modifiers: [{ id: "M1", name: "Amaretti", priceCents: 0 }],
    });
  });

  it("defaults SINGLE-select min to 0 when Square leaves min unset", () => {
    const result = serializeModifierList({
      type: "MODIFIER_LIST",
      id: "ML_OPT",
      modifierListData: {
        name: "Toppings",
        selectionType: "SINGLE",
        // no minSelectedModifiers
        modifiers: [
          {
            type: "MODIFIER",
            id: "M_TOP",
            modifierData: { name: "No Cherry" },
          },
        ],
      },
    } as any);
    expect(result.minSelected).toBe(0);
    expect(result.maxSelected).toBe(null);
    expect(result.modifierType).toBe("list");
  });

  it("maps a MULTIPLE-select list with a price upcharge", () => {
    const result = serializeModifierList(
      {
        type: "MODIFIER_LIST",
        id: "ML2",
        modifierListData: {
          name: "Toppings",
          selectionType: "MULTIPLE",
          modifiers: [
            {
              type: "MODIFIER",
              id: "M2",
              modifierData: {
                name: "Pistachio",
                priceMoney: { amount: BigInt(50), currency: "USD" },
              },
            },
          ],
        },
      } as any
    );

    expect(result.selectionType).toBe("MULTIPLE");
    expect(result.minSelected).toBe(0);
    expect(result.maxSelected).toBe(null);
    expect(result.modifiers[0].priceCents).toBe(50);
  });

  it("returns empty modifiers array when the source has none", () => {
    const result = serializeModifierList({
      type: "MODIFIER_LIST",
      id: "ML3",
      modifierListData: {
        name: "Empty",
        selectionType: "SINGLE",
      },
    } as any);
    expect(result.modifiers).toEqual([]);
  });

  it("normalizes -1 min/max on the base list to defaults", () => {
    const result = serializeModifierList({
      type: "MODIFIER_LIST",
      id: "ML_NEG",
      modifierListData: {
        name: "Topping",
        selectionType: "MULTIPLE",
        minSelectedModifiers: -1,
        maxSelectedModifiers: -1,
        modifiers: [],
      },
    } as any);
    expect(result.minSelected).toBe(0);
    expect(result.maxSelected).toBe(null);
  });

  it("maps a TEXT modifier list to a free-text shape", () => {
    const result = serializeModifierList({
      type: "MODIFIER_LIST",
      id: "ML_TEXT",
      modifierListData: {
        name: "Cannoli Special Notes",
        selectionType: "SINGLE",
        modifierType: "TEXT",
        maxLength: 150,
        textRequired: false,
      },
    } as any);
    expect(result.modifierType).toBe("text");
    expect(result.maxLength).toBe(150);
    expect(result.textRequired).toBe(false);
    expect(result.minSelected).toBe(0);
    expect(result.modifiers).toEqual([]);
  });

  it("marks a TEXT modifier list required when textRequired is true", () => {
    const result = serializeModifierList({
      type: "MODIFIER_LIST",
      id: "ML_TEXT_REQ",
      modifierListData: {
        name: "Required Note",
        selectionType: "SINGLE",
        modifierType: "TEXT",
        textRequired: true,
      },
    } as any);
    expect(result.modifierType).toBe("text");
    expect(result.minSelected).toBe(1);
    expect(result.textRequired).toBe(true);
  });
});

describe("serializeItem", () => {
  const baseItem = {
    type: "ITEM",
    id: "I1",
    itemData: {
      name: "Cookies",
      description: "Box of assorted",
      variations: [
        {
          type: "ITEM_VARIATION",
          id: "V1",
          itemVariationData: {
            name: "Regular",
            priceMoney: { amount: BigInt(1500), currency: "USD" },
            trackInventory: false,
            locationOverrides: [
              { locationId: "L1", trackInventory: false },
            ],
          },
        },
      ],
      modifierListInfo: [{ modifierListId: "ML1", enabled: true }],
    },
  } as any;

  const modifierLists = [
    {
      id: "ML1",
      name: "Cookie Flavors",
      modifierType: "list" as const,
      selectionType: "SINGLE" as const,
      minSelected: 1,
      maxSelected: 1,
      modifiers: [{ id: "M1", name: "Amaretti", priceCents: 0 }],
    },
  ];

  it("maps an item with one variation and one attached modifier list", () => {
    const result = serializeItem(baseItem, "Cookie", modifierLists, {});
    expect(result.id).toBe("I1");
    expect(result.name).toBe("Cookies");
    expect(result.categoryName).toBe("Cookie");
    expect(result.variations).toHaveLength(1);
    expect(result.variations[0]).toMatchObject({
      id: "V1",
      name: "Regular",
      priceCents: 1500,
      inStock: true,
    });
    expect(result.modifierLists).toHaveLength(1);
    expect(result.modifierLists[0].id).toBe("ML1");
    expect(result.modifierLists[0].minSelected).toBe(1);
  });

  it("treats -1 sentinel from modifierListInfo as 'no override'", () => {
    // Square emits -1 when no per-attachment override is set; honoring that as
    // a real value would clamp maxSelected to -1 and block every selection.
    const item = {
      type: "ITEM",
      id: "I_NEG_OVERRIDE",
      itemData: {
        name: "Item",
        variations: [
          {
            type: "ITEM_VARIATION",
            id: "V",
            itemVariationData: {
              name: "Default",
              priceMoney: { amount: BigInt(100), currency: "USD" },
            },
          },
        ],
        modifierListInfo: [
          {
            modifierListId: "ML1",
            enabled: true,
            minSelectedModifiers: -1,
            maxSelectedModifiers: -1,
          },
        ],
      },
    } as any;
    const result = serializeItem(item, "Cat", modifierLists, {});
    // Falls through to the base list values rather than -1.
    expect(result.modifierLists[0].minSelected).toBe(1);
    expect(result.modifierLists[0].maxSelected).toBe(1);
  });

  it("applies per-attachment min/max overrides from modifierListInfo", () => {
    const item = {
      type: "ITEM",
      id: "I_OVERRIDE",
      itemData: {
        name: "Item",
        variations: [
          {
            type: "ITEM_VARIATION",
            id: "V",
            itemVariationData: {
              name: "Default",
              priceMoney: { amount: BigInt(100), currency: "USD" },
            },
          },
        ],
        modifierListInfo: [
          {
            modifierListId: "ML1",
            enabled: true,
            minSelectedModifiers: 0,
            maxSelectedModifiers: 2,
          },
        ],
      },
    } as any;
    const result = serializeItem(item, "Cat", modifierLists, {});
    expect(result.modifierLists[0].minSelected).toBe(0);
    expect(result.modifierLists[0].maxSelected).toBe(2);
  });

  it("marks a stockable variation out of stock when count is zero", () => {
    const stockableItem = {
      ...baseItem,
      itemData: {
        ...baseItem.itemData,
        variations: [
          {
            type: "ITEM_VARIATION",
            id: "V2",
            itemVariationData: {
              name: "Small",
              priceMoney: { amount: BigInt(500), currency: "USD" },
              trackInventory: true,
            },
          },
        ],
      },
    };
    const result = serializeItem(stockableItem, "Ice Cream", [], { V2: 0 });
    expect(result.variations[0].inStock).toBe(false);
  });

  it("marks a stockable variation in stock when count is positive", () => {
    const stockableItem = {
      ...baseItem,
      itemData: {
        ...baseItem.itemData,
        variations: [
          {
            type: "ITEM_VARIATION",
            id: "V3",
            itemVariationData: {
              name: "Pint",
              priceMoney: { amount: BigInt(1200), currency: "USD" },
              trackInventory: true,
            },
          },
        ],
      },
    };
    const result = serializeItem(stockableItem, "Ice Cream", [], { V3: 5 });
    expect(result.variations[0].inStock).toBe(true);
  });

  it("returns empty variations array when the source has none", () => {
    const itemNoVars = {
      type: "ITEM",
      id: "I_NOVAR",
      itemData: { name: "Empty Item" },
    } as any;
    const result = serializeItem(itemNoVars, "Misc", [], {});
    expect(result.variations).toEqual([]);
  });

  it("defaults price to 0 cents when priceMoney is missing", () => {
    const item = {
      type: "ITEM",
      id: "I_NOPRICE",
      itemData: {
        name: "Free Sample",
        variations: [
          {
            type: "ITEM_VARIATION",
            id: "V_NOPRICE",
            itemVariationData: { name: "Default" },
          },
        ],
      },
    } as any;
    const result = serializeItem(item, "Sample", [], {});
    expect(result.variations[0].priceCents).toBe(0);
  });

  it("drops a modifier list whose modifierListInfo is disabled", () => {
    const item = {
      type: "ITEM",
      id: "I_DISABLED",
      itemData: {
        name: "Cookies",
        variations: [
          {
            type: "ITEM_VARIATION",
            id: "V_X",
            itemVariationData: {
              name: "Regular",
              priceMoney: { amount: BigInt(100), currency: "USD" },
            },
          },
        ],
        modifierListInfo: [
          { modifierListId: "ML_ON", enabled: true },
          { modifierListId: "ML_OFF", enabled: false },
        ],
      },
    } as any;
    const allLists = [
      {
        id: "ML_ON",
        name: "On",
        modifierType: "list" as const,
        selectionType: "SINGLE" as const,
        minSelected: 1,
        maxSelected: 1,
        modifiers: [],
      },
      {
        id: "ML_OFF",
        name: "Off",
        modifierType: "list" as const,
        selectionType: "SINGLE" as const,
        minSelected: 1,
        maxSelected: 1,
        modifiers: [],
      },
    ];
    const result = serializeItem(item, "Cookie", allLists, {});
    expect(result.modifierLists.map((m) => m.id)).toEqual(["ML_ON"]);
  });
});

describe("mergeCannoliItems", () => {
  const mkItem = (
    overrides: Partial<SnapshotItem> & { id: string; name: string }
  ): SnapshotItem => ({
    description: undefined,
    categoryName: "Cannoli",
    variations: [],
    modifierLists: [],
    ...overrides,
  });

  const ICE_CREAM = "Cannoli Online - Ice Cream";
  const RICOTTA = "Cannoli Online - Ricotta";
  const SET_ITEM = "Cannoli Online - Set";
  const KIT_LIST_NAME = "Cannoli Kit";
  const BOXES_LIST_NAME = "Cannoli Multiple Boxes";
  const SET_FILLING_TYPE_LIST = "Cannoli Set Filling";

  const options = {
    iceCreamItemName: ICE_CREAM,
    ricottaItemName: RICOTTA,
    setItemName: SET_ITEM,
    compositeName: "Cannoli",
    compositeId: "cannoli__composite",
    kitCompositeName: "Cannoli Kit",
    kitCompositeId: "cannoli-kit__composite",
    kitModifierListName: KIT_LIST_NAME,
    multipleBoxesModifierListName: BOXES_LIST_NAME,
    kitGroupSize: 6,
    perKitFeeCents: 200,
    setCompositeName: "Cannoli Set",
    setCompositeId: "cannoli-set__composite",
    setFillingTypeListName: SET_FILLING_TYPE_LIST,
    setRicottaOptionName: "Ricotta",
    setIceCreamOptionName: "Ice Cream",
    ricottaOnlyListSuffixes: ["shell", "filling", "garnish"] as const,
    iceCreamOnlyListSuffixes: ["ice cream flavor"] as const,
    setDefaults: {
      ricottaFillingListSuffix: "filling",
      ricottaFillingOptionName: "Original",
      shellListSuffix: "shell",
      shellOptionName: "Chocolate",
      garnishListSuffix: "garnish",
      garnishOptionName: "Mixed Garnish",
    },
    setReservedModifierNames: new Set<string>(["Mixed Garnish", "Mixed Shell"]),
  };

  const kitListOn = (id: string): SnapshotModifierList => ({
    id,
    name: KIT_LIST_NAME,
    modifierType: "list",
    selectionType: "SINGLE",
    minSelected: 0,
    maxSelected: 1,
    modifiers: [{ id: `${id}_M`, name: KIT_LIST_NAME, priceCents: 0 }],
  });

  const boxesListOn = (id: string): SnapshotModifierList => ({
    id,
    name: BOXES_LIST_NAME,
    modifierType: "list",
    selectionType: "SINGLE",
    minSelected: 0,
    maxSelected: 1,
    modifiers: [],
  });

  it("emits Cannoli + Cannoli Kit composites and drops the underlying filling items", () => {
    const items: SnapshotItem[] = [
      mkItem({
        id: "I_IC",
        name: ICE_CREAM,
        variations: [
          { id: "V_IC_FULL", name: "Full Size", priceCents: 700, inStock: true, pickupEnabled: true },
          { id: "V_IC_MINI", name: "Mini Size", priceCents: 400, inStock: true, pickupEnabled: true },
        ],
        modifierLists: [
          boxesListOn("ML_BOXES_IC"),
          { id: "ML_FLAVOR", name: "Flavor", modifierType: "list", selectionType: "SINGLE", minSelected: 1, maxSelected: 1, modifiers: [] },
          kitListOn("ML_KIT_IC"),
        ],
      }),
      mkItem({
        id: "I_RIC",
        name: RICOTTA,
        variations: [
          { id: "V_RIC_FULL", name: "Full Size", priceCents: 700, inStock: true, pickupEnabled: true },
          { id: "V_RIC_MINI", name: "Mini Size", priceCents: 400, inStock: true, pickupEnabled: true },
        ],
        modifierLists: [
          boxesListOn("ML_BOXES_RIC"),
          { id: "ML_SHELL", name: "Shell", modifierType: "list", selectionType: "SINGLE", minSelected: 1, maxSelected: 1, modifiers: [] },
          { id: "ML_FILLING", name: "Filling", modifierType: "list", selectionType: "SINGLE", minSelected: 1, maxSelected: 1, modifiers: [] },
          { id: "ML_GARNISH", name: "Garnish", modifierType: "list", selectionType: "MULTIPLE", minSelected: 0, maxSelected: 3, modifiers: [] },
          kitListOn("ML_KIT_RIC"),
        ],
      }),
    ];

    const result = mergeCannoliItems(items, options);

    expect(result.map((i) => i.id)).toEqual([
      "cannoli__composite",
      "cannoli-kit__composite",
    ]);

    const [composite, kit] = result;

    expect(composite.name).toBe("Cannoli");
    expect(composite.kit).toBeUndefined();
    const [ic, ric] = composite.cannoliFillings!;
    expect(ic.variations.map((v) => v.id)).toEqual(["V_IC_FULL", "V_IC_MINI"]);
    expect(ic.modifierLists.map((m) => m.name)).toEqual(["Flavor"]);
    expect(ric.modifierLists.map((m) => m.name)).toEqual([
      "Shell",
      "Filling",
      "Garnish",
    ]);

    expect(kit.name).toBe("Cannoli Kit");
    expect(kit.kit).toEqual({
      perKitFeeCents: 200,
      groupSize: 6,
    });
    const [kitIc, kitRic] = kit.cannoliFillings!;
    expect(kitIc.variations.map((v) => v.id)).toEqual(["V_IC_FULL"]);
    expect(kitIc.modifierLists.map((m) => m.name)).toEqual(["Flavor"]);
    expect(kitRic.variations.map((v) => v.id)).toEqual(["V_RIC_FULL"]);
    expect(kitRic.modifierLists.map((m) => m.name)).toEqual(["Shell", "Filling", "Garnish"]);
  });

  it("places composites at the position of the first filling, preserving surrounding items", () => {
    const items: SnapshotItem[] = [
      mkItem({ id: "I_COOK", name: "Cookies" }),
      mkItem({
        id: "I_IC",
        name: ICE_CREAM,
        variations: [{ id: "V1", name: "Full Size", priceCents: 700, inStock: true, pickupEnabled: true }],
        modifierLists: [kitListOn("ML_KIT")],
      }),
      mkItem({ id: "I_GELATO", name: "Gelato" }),
      mkItem({
        id: "I_RIC",
        name: RICOTTA,
        variations: [{ id: "V2", name: "Full Size", priceCents: 700, inStock: true, pickupEnabled: true }],
        modifierLists: [kitListOn("ML_KIT")],
      }),
    ];
    const result = mergeCannoliItems(items, options);
    expect(result.map((i) => i.name)).toEqual([
      "Cookies",
      "Cannoli",
      "Cannoli Kit",
      "Gelato",
    ]);
  });

  it("passes through unrelated items unchanged when no fillings exist", () => {
    const items: SnapshotItem[] = [
      mkItem({ id: "I_COOK", name: "Cookies", categoryName: "Cookies" }),
      mkItem({ id: "I_GELATO", name: "Gelato", categoryName: "Frozen" }),
    ];
    const result = mergeCannoliItems(items, options);
    expect(result).toEqual(items);
  });

  it("does not produce composites when only one filling exists", () => {
    const items: SnapshotItem[] = [
      mkItem({
        id: "I_IC",
        name: ICE_CREAM,
        variations: [{ id: "V_IC", name: "Full Size", priceCents: 700, inStock: true, pickupEnabled: true }],
      }),
    ];
    const result = mergeCannoliItems(items, options);
    expect(result.map((i) => i.name)).toEqual([ICE_CREAM]);
    expect(result[0].cannoliFillings).toBeUndefined();
  });

  // Factories for the Cannoli Set composite test inputs. Defined as
  // functions so each test call produces fresh objects — avoids cross-test
  // mutation when a test reassigns a modifiers array or flips a soldOut
  // flag on the underlying data.
  const setFillingTypeList = (): SnapshotModifierList => ({
    id: "ML_SET_FILLING_TYPE",
    name: SET_FILLING_TYPE_LIST,
    modifierType: "list",
    selectionType: "SINGLE",
    minSelected: 1,
    maxSelected: 1,
    modifiers: [
      { id: "M_FT_RIC", name: "Ricotta", priceCents: 0 },
      { id: "M_FT_IC", name: "Ice Cream", priceCents: 0 },
    ],
  });
  const ricottaFillingList = (): SnapshotModifierList => ({
    // Single-select on the regular Ricotta item; the Set composite overrides
    // it to MULTIPLE/no-max in buildSetComposite.
    id: "ML_FILLING",
    name: "Cannoli Ricotta Filling",
    modifierType: "list",
    selectionType: "SINGLE",
    minSelected: 0,
    maxSelected: 0,
    modifiers: [
      { id: "M_FILL_ORIGINAL", name: "Original", priceCents: 0 },
      { id: "M_FILL_CHOC", name: "Chocolate", priceCents: 0 },
    ],
  });
  const ricottaShellList = (): SnapshotModifierList => ({
    id: "ML_SHELL",
    name: "Cannoli Ricotta Shell",
    modifierType: "list",
    selectionType: "SINGLE",
    minSelected: 0,
    maxSelected: 1,
    modifiers: [
      { id: "M_SHELL_PLAIN", name: "Plain", priceCents: 0 },
      { id: "M_SHELL_CHOC", name: "Chocolate", priceCents: 0 },
      { id: "M_SHELL_MIXED", name: "Mixed Shell", priceCents: 0 },
    ],
  });
  const ricottaGarnishList = (): SnapshotModifierList => ({
    id: "ML_GARNISH",
    name: "Cannoli Ricotta Garnish",
    modifierType: "list",
    selectionType: "MULTIPLE",
    minSelected: 0,
    maxSelected: 3,
    modifiers: [
      { id: "M_GARN_SPRINKLES", name: "Sprinkles", priceCents: 0 },
      { id: "M_GARN_PISTACHIO", name: "Pistachio", priceCents: 50 },
      { id: "M_GARN_MIXED", name: "Mixed Garnish", priceCents: 0 },
    ],
  });
  const iceCreamFlavorList = (): SnapshotModifierList => ({
    id: "ML_IC_FLAVOR",
    name: "Cannoli Ice Cream Flavor",
    modifierType: "list",
    selectionType: "SINGLE",
    minSelected: 0,
    maxSelected: 1,
    modifiers: [
      { id: "M_IC_VAN", name: "Vanilla", priceCents: 0 },
      { id: "M_IC_CHOC", name: "Chocolate", priceCents: 0 },
    ],
  });
  const specialNotesList = (): SnapshotModifierList => ({
    id: "ML_NOTES",
    name: "Cannoli Special Notes",
    modifierType: "text",
    selectionType: "SINGLE",
    minSelected: 0,
    maxSelected: 1,
    modifiers: [],
    maxLength: 150,
    textRequired: false,
  });

  // Source items for the regular Cannoli composite tests above this block.
  // Set the same way as before: Ricotta + Ice Cream items, no Set item.
  const setRicotta = (
    overrides: Partial<SnapshotItem> = {},
  ): SnapshotItem =>
    mkItem({
      id: "I_RIC",
      name: RICOTTA,
      variations: [
        { id: "V_RIC_FULL", name: "Full Size", priceCents: 700, inStock: true, pickupEnabled: true },
        { id: "V_RIC_MINI", name: "Mini Size", priceCents: 400, inStock: true, pickupEnabled: true },
      ],
      modifierLists: [
        ricottaShellList(),
        ricottaFillingList(),
        ricottaGarnishList(),
        boxesListOn("ML_RIC_BOXES"),
        kitListOn("ML_RIC_KIT"),
        specialNotesList(),
      ],
      ...overrides,
    });

  const setIceCream = (): SnapshotItem =>
    mkItem({
      id: "I_IC",
      name: ICE_CREAM,
      variations: [
        { id: "V_IC_FULL", name: "Full Size", priceCents: 700, inStock: true, pickupEnabled: true },
        { id: "V_IC_MINI", name: "Mini Size", priceCents: 400, inStock: true, pickupEnabled: true },
      ],
      modifierLists: [iceCreamFlavorList()],
    });

  // The new "Cannoli Online - Set" Square item: real variations (set sizes)
  // plus a "Cannoli Set Filling" modifier (Ricotta / Ice Cream) and the
  // shared per-filling lists. Multiple Boxes + Special Notes attach here too.
  const setOnline = (
    overrides: Partial<SnapshotItem> = {},
  ): SnapshotItem =>
    mkItem({
      id: "I_SET",
      name: SET_ITEM,
      variations: [
        { id: "V_SET_FULL_6", name: "Full Size - Set of 6", priceCents: 3900, inStock: true, pickupEnabled: true },
        { id: "V_SET_FULL_12", name: "Full Size - Set of 12", priceCents: 7200, inStock: true, pickupEnabled: true },
        { id: "V_SET_MINI_12", name: "Mini Size - Set of 12", priceCents: 4800, inStock: true, pickupEnabled: true },
        { id: "V_SET_MINI_24", name: "Mini Size - Set of 24", priceCents: 8400, inStock: true, pickupEnabled: true },
      ],
      modifierLists: [
        setFillingTypeList(),
        ricottaShellList(),
        ricottaFillingList(),
        ricottaGarnishList(),
        iceCreamFlavorList(),
        boxesListOn("ML_SET_BOXES"),
        specialNotesList(),
      ],
      ...overrides,
    });

  describe("Cannoli Set composite", () => {
    it("emits the set composite when the Set item exists alongside Ricotta + Ice Cream", () => {
      const result = mergeCannoliItems(
        [setIceCream(), setRicotta(), setOnline()],
        options,
      );
      expect(result.map((i) => i.id)).toEqual([
        "cannoli__composite",
        "cannoli-kit__composite",
        "cannoli-set__composite",
      ]);
      const set = result[2];
      expect(set.name).toBe("Cannoli Set");
      expect(set.kit).toBeUndefined();
      expect(set.cannoliFillings).toBeUndefined();
      expect(set.set).toBeDefined();
    });

    it("set composite passes through the new Square item's variations and prices", () => {
      const result = mergeCannoliItems(
        [setIceCream(), setRicotta(), setOnline()],
        options,
      );
      const set = result[2];
      expect(set.variations.map((v) => v.name)).toEqual([
        "Full Size - Set of 6",
        "Full Size - Set of 12",
        "Mini Size - Set of 12",
        "Mini Size - Set of 24",
      ]);
      expect(set.variations.map((v) => v.priceCents)).toEqual([
        3900, 7200, 4800, 8400,
      ]);
    });

    it("SetInfo carries filling-type list id and Ricotta / Ice Cream modifier ids", () => {
      const result = mergeCannoliItems(
        [setIceCream(), setRicotta(), setOnline()],
        options,
      );
      const set = result[2];
      expect(set.set!.fillingTypeListId).toBe("ML_SET_FILLING_TYPE");
      expect(set.set!.ricottaModifierId).toBe("M_FT_RIC");
      expect(set.set!.iceCreamModifierId).toBe("M_FT_IC");
    });

    it("SetInfo classifies Shell / Filling / Garnish as ricotta-only and Ice Cream Flavor as ice-cream-only", () => {
      const result = mergeCannoliItems(
        [setIceCream(), setRicotta(), setOnline()],
        options,
      );
      const set = result[2];
      expect(set.set!.ricottaOnlyListIds.sort()).toEqual(
        ["ML_FILLING", "ML_GARNISH", "ML_SHELL"].sort(),
      );
      expect(set.set!.iceCreamOnlyListIds).toEqual(["ML_IC_FLAVOR"]);
    });

    it("SetInfo defaultSelections seeds Ricotta / Original / Chocolate / Mixed Garnish", () => {
      const result = mergeCannoliItems(
        [setIceCream(), setRicotta(), setOnline()],
        options,
      );
      const set = result[2];
      const byList = Object.fromEntries(
        set.set!.defaultSelections.map((d) => [d.listId, d.modifierIds]),
      );
      expect(byList["ML_SET_FILLING_TYPE"]).toEqual(["M_FT_RIC"]);
      expect(byList["ML_FILLING"]).toEqual(["M_FILL_ORIGINAL"]);
      expect(byList["ML_SHELL"]).toEqual(["M_SHELL_CHOC"]);
      expect(byList["ML_GARNISH"]).toEqual(["M_GARN_MIXED"]);
    });

    it("set composite overrides the Ricotta Filling list to MULTIPLE / no-max so the user can pick multiple flavors", () => {
      const result = mergeCannoliItems(
        [setIceCream(), setRicotta(), setOnline()],
        options,
      );
      const set = result[2];
      const filling = set.modifierLists.find((m) => m.id === "ML_FILLING")!;
      expect(filling.selectionType).toBe("MULTIPLE");
      expect(filling.maxSelected).toBeNull();
    });

    it("set composite carries the new Set item's modifier lists (Filling Type, Shell, Filling, Garnish, Ice Cream Flavor, Multiple Boxes, Special Notes)", () => {
      const result = mergeCannoliItems(
        [setIceCream(), setRicotta(), setOnline()],
        options,
      );
      const set = result[2];
      expect(set.modifierLists.map((m) => m.name)).toEqual([
        "Cannoli Set Filling",
        "Cannoli Ricotta Shell",
        "Cannoli Ricotta Filling",
        "Cannoli Ricotta Garnish",
        "Cannoli Ice Cream Flavor",
        "Cannoli Multiple Boxes",
        "Cannoli Special Notes",
      ]);
    });

    it("does not emit the set composite when the Set item is absent", () => {
      const result = mergeCannoliItems(
        [setIceCream(), setRicotta()],
        options,
      );
      expect(result.find((i) => i.id === "cannoli-set__composite")).toBeUndefined();
      // Cannoli + Cannoli Kit still emit normally.
      expect(result.map((i) => i.id)).toContain("cannoli__composite");
      expect(result.map((i) => i.id)).toContain("cannoli-kit__composite");
    });

    it("does not emit the set composite when the filling-type list is missing", () => {
      const broken = setOnline({
        modifierLists: [
          ricottaShellList(),
          ricottaFillingList(),
          ricottaGarnishList(),
          iceCreamFlavorList(),
          boxesListOn("ML_SET_BOXES"),
          specialNotesList(),
        ],
      });
      const result = mergeCannoliItems(
        [setIceCream(), setRicotta(), broken],
        options,
      );
      expect(result.find((i) => i.id === "cannoli-set__composite")).toBeUndefined();
    });

    it("does not emit the set composite when the filling-type list lacks the Ricotta or Ice Cream option", () => {
      const broken = setOnline();
      const ftList = broken.modifierLists.find(
        (m) => m.id === "ML_SET_FILLING_TYPE",
      )!;
      ftList.modifiers = ftList.modifiers.filter((m) => m.name !== "Ice Cream");
      const result = mergeCannoliItems(
        [setIceCream(), setRicotta(), broken],
        options,
      );
      expect(result.find((i) => i.id === "cannoli-set__composite")).toBeUndefined();
    });

    it("emits the set composite even when a default option is missing — that pre-selection just isn't seeded", () => {
      const partial = setOnline();
      const filling = partial.modifierLists.find((m) => m.id === "ML_FILLING")!;
      filling.modifiers = filling.modifiers.filter((m) => m.name !== "Original");
      const result = mergeCannoliItems(
        [setIceCream(), setRicotta(), partial],
        options,
      );
      const set = result.find((i) => i.id === "cannoli-set__composite");
      expect(set).toBeDefined();
      const byList = Object.fromEntries(
        set!.set!.defaultSelections.map((d) => [d.listId, d.modifierIds]),
      );
      // Filling-type default still applies; Ricotta filling default is missing
      // and absent from defaultSelections.
      expect(byList["ML_SET_FILLING_TYPE"]).toEqual(["M_FT_RIC"]);
      expect(byList["ML_FILLING"]).toBeUndefined();
      // Other defaults still resolve.
      expect(byList["ML_SHELL"]).toEqual(["M_SHELL_CHOC"]);
      expect(byList["ML_GARNISH"]).toEqual(["M_GARN_MIXED"]);
    });

    it("strips Mixed Garnish + Mixed Shell from the regular Cannoli composite (set-only options)", () => {
      const result = mergeCannoliItems(
        [setIceCream(), setRicotta(), setOnline()],
        options,
      );
      const regular = result[0];
      const ric = regular.cannoliFillings!.find((f) => f.key === "ricotta")!;
      const garnish = ric.modifierLists.find((m) => m.id === "ML_GARNISH")!;
      const shell = ric.modifierLists.find((m) => m.id === "ML_SHELL")!;
      expect(garnish.modifiers.map((m) => m.name)).not.toContain("Mixed Garnish");
      expect(shell.modifiers.map((m) => m.name)).not.toContain("Mixed Shell");
    });

    it("strips Mixed Garnish + Mixed Shell from the Cannoli Kit composite too", () => {
      const result = mergeCannoliItems(
        [setIceCream(), setRicotta(), setOnline()],
        options,
      );
      const kit = result[1];
      const ric = kit.cannoliFillings!.find((f) => f.key === "ricotta")!;
      const garnish = ric.modifierLists.find((m) => m.id === "ML_GARNISH")!;
      const shell = ric.modifierLists.find((m) => m.id === "ML_SHELL")!;
      expect(garnish.modifiers.map((m) => m.name)).not.toContain("Mixed Garnish");
      expect(shell.modifiers.map((m) => m.name)).not.toContain("Mixed Shell");
    });

    it("KEEPS Mixed Garnish + Mixed Shell on the Set composite (those are the set-only options)", () => {
      const result = mergeCannoliItems(
        [setIceCream(), setRicotta(), setOnline()],
        options,
      );
      const set = result[2];
      const garnish = set.modifierLists.find((m) => m.id === "ML_GARNISH")!;
      const shell = set.modifierLists.find((m) => m.id === "ML_SHELL")!;
      expect(garnish.modifiers.map((m) => m.name)).toContain("Mixed Garnish");
      expect(shell.modifiers.map((m) => m.name)).toContain("Mixed Shell");
    });
  });

  it("emits the kit composite even when the kit modifier list is absent in Square", () => {
    // The kit fee is applied at order submit (ad-hoc line item) rather than
    // via a catalog modifier, so the kit composite never depends on the
    // existence of any catalog modifier list. POS visibility on the cannoli
    // line itself is handled by a fixed line-note prefix client-side.
    const items: SnapshotItem[] = [
      mkItem({
        id: "I_IC",
        name: ICE_CREAM,
        variations: [{ id: "V_IC", name: "Full Size", priceCents: 700, inStock: true, pickupEnabled: true }],
        modifierLists: [],
      }),
      mkItem({
        id: "I_RIC",
        name: RICOTTA,
        variations: [{ id: "V_RIC", name: "Full Size", priceCents: 700, inStock: true, pickupEnabled: true }],
        modifierLists: [],
      }),
    ];
    const result = mergeCannoliItems(items, options);
    expect(result.map((i) => i.id)).toEqual([
      "cannoli__composite",
      "cannoli-kit__composite",
    ]);
    expect(result[1].kit).toEqual({ perKitFeeCents: 200, groupSize: 6 });
  });
});
