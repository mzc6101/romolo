import { describe, it, expect } from "vitest";
import {
  mergeCannoliItems,
  serializeItem,
  serializeModifierList,
} from "./serializers";
import type {
  AutoModifierRef,
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
  const KIT_LIST_NAME = "Cannoli Kit";
  const BOXES_LIST_NAME = "Cannoli Multiple Boxes";

  const options = {
    iceCreamItemName: ICE_CREAM,
    ricottaItemName: RICOTTA,
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
    setAutoModifiers: [
      { listNameSuffix: "filling", modifierName: "Original" },
      { listNameSuffix: "shell", modifierName: "Chocolate" },
      { listNameSuffix: "garnish", modifierName: "Mixed Garnish" },
    ],
    setOptionSpecs: [
      { key: "6_full", label: "6 Full Size", variationPrefix: "full", qty: 6 },
      { key: "12_full", label: "12 Full Size", variationPrefix: "full", qty: 12 },
      { key: "12_mini", label: "12 Mini Size", variationPrefix: "mini", qty: 12 },
      { key: "24_mini", label: "24 Mini Size", variationPrefix: "mini", qty: 24 },
    ],
    setReservedModifierNames: new Set<string>(["Mixed Garnish"]),
    specialNotesListNameSuffix: "special notes",
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
  const fillingList = (): SnapshotModifierList => ({
    id: "ML_FILLING",
    name: "Cannoli Ricotta Filling",
    modifierType: "list",
    selectionType: "SINGLE",
    minSelected: 1,
    maxSelected: 1,
    modifiers: [
      { id: "M_FILL_ORIGINAL", name: "Original", priceCents: 0 },
      { id: "M_FILL_CHOC", name: "Chocolate", priceCents: 0 },
    ],
  });
  const shellList = (): SnapshotModifierList => ({
    id: "ML_SHELL",
    name: "Cannoli Ricotta Shell",
    modifierType: "list",
    selectionType: "SINGLE",
    minSelected: 1,
    maxSelected: 1,
    modifiers: [
      { id: "M_SHELL_PLAIN", name: "Plain", priceCents: 0 },
      { id: "M_SHELL_CHOC", name: "Chocolate", priceCents: 0 },
    ],
  });
  const garnishListWithMixed = (): SnapshotModifierList => ({
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

  const setRicotta = (
    overrides: Partial<SnapshotItem> = {},
  ): SnapshotItem =>
    mkItem({
      id: "I_RIC",
      name: RICOTTA,
      variations: [
        {
          id: "V_RIC_FULL",
          name: "Full Size",
          priceCents: 700,
          inStock: true,
          pickupEnabled: true,
        },
        {
          id: "V_RIC_MINI",
          name: "Mini Size",
          priceCents: 400,
          inStock: true,
          pickupEnabled: true,
        },
      ],
      modifierLists: [
        shellList(),
        fillingList(),
        garnishListWithMixed(),
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
        {
          id: "V_IC_FULL",
          name: "Full Size",
          priceCents: 700,
          inStock: true,
          pickupEnabled: true,
        },
        {
          id: "V_IC_MINI",
          name: "Mini Size",
          priceCents: 400,
          inStock: true,
          pickupEnabled: true,
        },
      ],
      modifierLists: [
        {
          id: "ML_FLAVOR",
          name: "Flavor",
          modifierType: "list",
          selectionType: "SINGLE",
          minSelected: 1,
          maxSelected: 1,
          modifiers: [],
        },
      ],
    });

  // Richer Ice Cream factory used by Customize tests. Includes Multiple
  // Boxes and Special Notes lists so the Set composite's strip rules are
  // exercised.
  const setIceCreamRich = (): SnapshotItem =>
    mkItem({
      id: "I_IC",
      name: ICE_CREAM,
      variations: [
        {
          id: "V_IC_FULL",
          name: "Full Size",
          priceCents: 700,
          inStock: true,
          pickupEnabled: true,
        },
        {
          id: "V_IC_MINI",
          name: "Mini Size",
          priceCents: 400,
          inStock: true,
          pickupEnabled: true,
        },
      ],
      modifierLists: [
        {
          id: "ML_IC_FLAVOR",
          name: "Cannoli Ice Cream Flavor",
          modifierType: "list",
          selectionType: "SINGLE",
          minSelected: 1,
          maxSelected: 1,
          modifiers: [
            { id: "M_IC_VAN", name: "Vanilla", priceCents: 0 },
            { id: "M_IC_CHOC", name: "Chocolate", priceCents: 0 },
          ],
        },
        boxesListOn("ML_IC_BOXES"),
        kitListOn("ML_IC_KIT"),
        {
          id: "ML_IC_NOTES",
          name: "Cannoli Special Notes",
          modifierType: "text",
          selectionType: "SINGLE",
          minSelected: 0,
          maxSelected: 1,
          modifiers: [],
          maxLength: 150,
          textRequired: false,
        },
      ],
    });

  describe("Cannoli Set composite", () => {
    it("emits the set composite when Ricotta has all three auto modifiers + Special Notes", () => {
      const items = [setIceCream(), setRicotta()];
      const result = mergeCannoliItems(items, options);
      expect(result.map((i) => i.id)).toEqual([
        "cannoli__composite",
        "cannoli-kit__composite",
        "cannoli-set__composite",
      ]);
      const set = result[2];
      expect(set.name).toBe("Cannoli Set");
      expect(set.cannoliFillings).toBeDefined();
      expect(set.kit).toBeUndefined();
      expect(set.set).toBeDefined();
    });

    it("set composite carries Multiple Boxes + Special Notes at the top level and empty top-level variations", () => {
      const result = mergeCannoliItems([setIceCream(), setRicotta()], options);
      const set = result[2];
      expect(set.variations).toEqual([]);
      // Multiple Boxes lives only on the set composite (regular Cannoli has
      // it stripped); Special Notes follows it. Order matters — modifierListRank
      // in OrderFlow expects Boxes before Notes.
      expect(set.modifierLists.map((m) => m.name)).toEqual([
        "Cannoli Multiple Boxes",
        "Cannoli Special Notes",
      ]);
      expect(set.modifierLists[1].modifierType).toBe("text");
    });

    it("set options resolve to the Full / Mini Ricotta variations with correct qtys and prices", () => {
      const result = mergeCannoliItems([setIceCream(), setRicotta()], options);
      const set = result[2];
      const ic = (id: string, priceCents: number) => ({
        iceCream: { variationId: id, priceCents, inStock: true },
      });
      expect(set.set!.options).toEqual([
        { key: "6_full", label: "6 Full Size", variationId: "V_RIC_FULL", qty: 6, priceCents: 700, inStock: true, ...ic("V_IC_FULL", 700) },
        { key: "12_full", label: "12 Full Size", variationId: "V_RIC_FULL", qty: 12, priceCents: 700, inStock: true, ...ic("V_IC_FULL", 700) },
        { key: "12_mini", label: "12 Mini Size", variationId: "V_RIC_MINI", qty: 12, priceCents: 400, inStock: true, ...ic("V_IC_MINI", 400) },
        { key: "24_mini", label: "24 Mini Size", variationId: "V_RIC_MINI", qty: 24, priceCents: 400, inStock: true, ...ic("V_IC_MINI", 400) },
      ]);
    });

    it("set autoModifiers resolve Ricotta filling, Chocolate shell, Mixed garnish by name", () => {
      const result = mergeCannoliItems([setIceCream(), setRicotta()], options);
      const set = result[2];
      const byList: Record<string, AutoModifierRef> = {};
      for (const am of set.set!.autoModifiers) byList[am.modifierListId] = am;
      expect(byList["ML_FILLING"]?.modifierId).toBe("M_FILL_ORIGINAL");
      expect(byList["ML_SHELL"]?.modifierId).toBe("M_SHELL_CHOC");
      expect(byList["ML_GARNISH"]?.modifierId).toBe("M_GARN_MIXED");
    });

    it("set option inStock mirrors the underlying variation's inStock flag", () => {
      const ricotta = setRicotta();
      // Mark Mini sold out — affects 24 Mini option only.
      ricotta.variations[1].inStock = false;
      const result = mergeCannoliItems([setIceCream(), ricotta], options);
      const set = result[2];
      const fullOpt = set.set!.options.find((o) => o.key === "6_full");
      const miniOpt = set.set!.options.find((o) => o.key === "24_mini");
      expect(fullOpt!.inStock).toBe(true);
      expect(miniOpt!.inStock).toBe(false);
    });

    it("set autoModifiers carry soldOut from the underlying modifier", () => {
      const ricotta = setRicotta();
      // Mark "Mixed Garnish" sold out at modifier-level.
      const garnish = ricotta.modifierLists.find((ml) => ml.id === "ML_GARNISH")!;
      const mixed = garnish.modifiers.find((m) => m.name === "Mixed Garnish")!;
      mixed.soldOut = true;
      const result = mergeCannoliItems([setIceCream(), ricotta], options);
      const set = result[2];
      const garnishAuto = set.set!.autoModifiers.find(
        (am) => am.modifierListId === "ML_GARNISH",
      );
      expect(garnishAuto?.soldOut).toBe(true);
    });

    it("strips Mixed from the regular Cannoli composite's Garnish list", () => {
      const result = mergeCannoliItems([setIceCream(), setRicotta()], options);
      const regular = result[0];
      const ricBranch = regular.cannoliFillings!.find((f) => f.key === "ricotta")!;
      const garnish = ricBranch.modifierLists.find((ml) => ml.id === "ML_GARNISH")!;
      expect(garnish.modifiers.map((m) => m.name)).toEqual([
        "Sprinkles",
        "Pistachio",
      ]);
    });

    it("strips Mixed from the Cannoli Kit composite's Garnish list", () => {
      const result = mergeCannoliItems([setIceCream(), setRicotta()], options);
      const kit = result[1];
      const ricBranch = kit.cannoliFillings!.find((f) => f.key === "ricotta")!;
      const garnish = ricBranch.modifierLists.find((ml) => ml.id === "ML_GARNISH")!;
      expect(garnish.modifiers.map((m) => m.name)).toEqual([
        "Sprinkles",
        "Pistachio",
      ]);
    });

    it("does not emit the set composite when the Mixed garnish modifier is missing", () => {
      const ricotta = setRicotta();
      const garnish = ricotta.modifierLists.find((ml) => ml.id === "ML_GARNISH")!;
      garnish.modifiers = garnish.modifiers.filter(
        (m) => m.name !== "Mixed Garnish",
      );
      const result = mergeCannoliItems([setIceCream(), ricotta], options);
      expect(result.map((i) => i.id)).toEqual([
        "cannoli__composite",
        "cannoli-kit__composite",
      ]);
    });

    it("does not emit the set composite when Special Notes list is missing", () => {
      const ricotta = setRicotta();
      ricotta.modifierLists = ricotta.modifierLists.filter(
        (ml) => ml.id !== "ML_NOTES",
      );
      const result = mergeCannoliItems([setIceCream(), ricotta], options);
      expect(result.find((i) => i.id === "cannoli-set__composite")).toBeUndefined();
    });

    it("does not emit the set composite when Mini variation is missing", () => {
      const ricotta = setRicotta();
      ricotta.variations = ricotta.variations.filter(
        (v) => !v.name.toLowerCase().startsWith("mini"),
      );
      const result = mergeCannoliItems([setIceCream(), ricotta], options);
      expect(result.find((i) => i.id === "cannoli-set__composite")).toBeUndefined();
    });

    it("emits the set composite even if the Ice Cream item is missing the Mixed option (set is Ricotta-only)", () => {
      // The user added Mixed to BOTH Ice Cream and Ricotta, but the set
      // composite only consults Ricotta. Removing Mixed from Ice Cream
      // does not block the set.
      const result = mergeCannoliItems([setIceCream(), setRicotta()], options);
      expect(result.find((i) => i.id === "cannoli-set__composite")).toBeDefined();
    });

    describe("cannoliFillings on the set composite (Customize mode)", () => {
      it("emits both Ricotta and Ice Cream filling branches", () => {
        const result = mergeCannoliItems(
          [setIceCreamRich(), setRicotta()],
          options,
        );
        const set = result[2];
        expect(set.cannoliFillings!.map((f) => f.key)).toEqual([
          "ice_cream",
          "ricotta",
        ]);
      });

      it("strips Multiple Boxes from both fillings", () => {
        const result = mergeCannoliItems(
          [setIceCreamRich(), setRicotta()],
          options,
        );
        const set = result[2];
        const ic = set.cannoliFillings!.find((f) => f.key === "ice_cream")!;
        const ric = set.cannoliFillings!.find((f) => f.key === "ricotta")!;
        expect(ic.modifierLists.map((m) => m.name)).not.toContain(
          "Cannoli Multiple Boxes",
        );
        expect(ric.modifierLists.map((m) => m.name)).not.toContain(
          "Cannoli Multiple Boxes",
        );
      });

      it("strips the Cannoli Kit modifier list from both fillings", () => {
        const result = mergeCannoliItems(
          [setIceCreamRich(), setRicotta()],
          options,
        );
        const set = result[2];
        const ic = set.cannoliFillings!.find((f) => f.key === "ice_cream")!;
        const ric = set.cannoliFillings!.find((f) => f.key === "ricotta")!;
        expect(ic.modifierLists.map((m) => m.name)).not.toContain("Cannoli Kit");
        expect(ric.modifierLists.map((m) => m.name)).not.toContain("Cannoli Kit");
      });

      it("strips per-filling Special Notes from both fillings (top-level Set Special Notes covers it)", () => {
        const result = mergeCannoliItems(
          [setIceCreamRich(), setRicotta()],
          options,
        );
        const set = result[2];
        const ic = set.cannoliFillings!.find((f) => f.key === "ice_cream")!;
        const ric = set.cannoliFillings!.find((f) => f.key === "ricotta")!;
        expect(ic.modifierLists.map((m) => m.modifierType)).not.toContain(
          "text",
        );
        expect(ric.modifierLists.map((m) => m.modifierType)).not.toContain(
          "text",
        );
      });

      it("KEEPS Mixed Garnish on the Set composite's Ricotta Garnish list (no reserved-name strip)", () => {
        const result = mergeCannoliItems(
          [setIceCreamRich(), setRicotta()],
          options,
        );
        const set = result[2];
        const ric = set.cannoliFillings!.find((f) => f.key === "ricotta")!;
        const garnish = ric.modifierLists.find((m) => m.id === "ML_GARNISH")!;
        expect(garnish.modifiers.map((m) => m.name)).toContain("Mixed Garnish");
      });

      it("Set Ricotta side exposes Shell, Filling, Garnish lists", () => {
        const result = mergeCannoliItems(
          [setIceCreamRich(), setRicotta()],
          options,
        );
        const set = result[2];
        const ric = set.cannoliFillings!.find((f) => f.key === "ricotta")!;
        expect(ric.modifierLists.map((m) => m.name)).toEqual([
          "Cannoli Ricotta Shell",
          "Cannoli Ricotta Filling",
          "Cannoli Ricotta Garnish",
        ]);
      });

      it("Set Ice Cream side exposes only the Flavor list (no shell, no garnish)", () => {
        const result = mergeCannoliItems(
          [setIceCreamRich(), setRicotta()],
          options,
        );
        const set = result[2];
        const ic = set.cannoliFillings!.find((f) => f.key === "ice_cream")!;
        expect(ic.modifierLists.map((m) => m.name)).toEqual([
          "Cannoli Ice Cream Flavor",
        ]);
      });

      it("filling branches carry the underlying Square item id and full variation lists", () => {
        const result = mergeCannoliItems(
          [setIceCreamRich(), setRicotta()],
          options,
        );
        const set = result[2];
        const ic = set.cannoliFillings!.find((f) => f.key === "ice_cream")!;
        const ric = set.cannoliFillings!.find((f) => f.key === "ricotta")!;
        expect(ic.squareItemId).toBe("I_IC");
        expect(ric.squareItemId).toBe("I_RIC");
        expect(ic.variations.map((v) => v.id)).toEqual([
          "V_IC_FULL",
          "V_IC_MINI",
        ]);
        expect(ric.variations.map((v) => v.id)).toEqual([
          "V_RIC_FULL",
          "V_RIC_MINI",
        ]);
      });
    });

    describe("SetOption.iceCream resolution", () => {
      it("populates iceCream with the matching Ice Cream variation per size", () => {
        const result = mergeCannoliItems(
          [setIceCreamRich(), setRicotta()],
          options,
        );
        const set = result[2];
        const sixFull = set.set!.options.find((o) => o.key === "6_full")!;
        const twentyFourMini = set.set!.options.find((o) => o.key === "24_mini")!;
        expect(sixFull.iceCream).toEqual({
          variationId: "V_IC_FULL",
          priceCents: 700,
          inStock: true,
        });
        expect(twentyFourMini.iceCream).toEqual({
          variationId: "V_IC_MINI",
          priceCents: 400,
          inStock: true,
        });
      });

      it("iceCream.inStock mirrors the underlying Ice Cream variation's inStock", () => {
        const ic = setIceCreamRich();
        // Mark Ice Cream Mini sold out — affects 12 Mini and 24 Mini iceCream refs.
        const miniVar = ic.variations.find((v) =>
          v.name.toLowerCase().startsWith("mini"),
        )!;
        miniVar.inStock = false;
        const result = mergeCannoliItems([ic, setRicotta()], options);
        const set = result[2];
        const fullOpt = set.set!.options.find((o) => o.key === "6_full")!;
        const miniOpt = set.set!.options.find((o) => o.key === "12_mini")!;
        expect(fullOpt.iceCream!.inStock).toBe(true);
        expect(miniOpt.iceCream!.inStock).toBe(false);
      });

      it("omits iceCream when the Ice Cream item lacks a matching variation", () => {
        const ic = setIceCreamRich();
        // Drop Ice Cream Mini variation — Mini set options should have no iceCream.
        ic.variations = ic.variations.filter(
          (v) => !v.name.toLowerCase().startsWith("mini"),
        );
        const result = mergeCannoliItems([ic, setRicotta()], options);
        const set = result[2];
        const fullOpt = set.set!.options.find((o) => o.key === "6_full")!;
        const miniOpt = set.set!.options.find((o) => o.key === "24_mini")!;
        expect(fullOpt.iceCream).toBeDefined();
        expect(miniOpt.iceCream).toBeUndefined();
      });

      it("Set composite still emits even when Ice Cream item has no matching variations at all", () => {
        // Ricotta supplies the set; missing Ice Cream variations should
        // degrade Customize → Ice Cream gracefully without blocking the set.
        const ic = setIceCreamRich();
        ic.variations = [];
        const result = mergeCannoliItems([ic, setRicotta()], options);
        expect(
          result.find((i) => i.id === "cannoli-set__composite"),
        ).toBeDefined();
      });
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
