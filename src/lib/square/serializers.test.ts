import { describe, it, expect } from "vitest";
import {
  mergeCannoliItems,
  serializeItem,
  serializeModifierList,
} from "./serializers";
import type { SnapshotItem } from "./types";

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
  const KIT = "Cannoli Online - Kit";

  const options = {
    iceCreamItemName: ICE_CREAM,
    ricottaItemName: RICOTTA,
    kitItemName: KIT,
    kitDisplayName: "Cannoli Kit",
    compositeName: "Cannoli",
    compositeId: "cannoli__composite",
  };

  it("merges Ice Cream + Ricotta into one composite, drops the underlying items", () => {
    const items: SnapshotItem[] = [
      mkItem({
        id: "I_IC",
        name: ICE_CREAM,
        variations: [
          { id: "V_IC_FULL", name: "Full", priceCents: 700, inStock: true, pickupEnabled: true },
          { id: "V_IC_MINI", name: "Mini", priceCents: 400, inStock: true, pickupEnabled: true },
        ],
        modifierLists: [
          { id: "ML_FLAVOR", name: "Flavor", modifierType: "list", selectionType: "SINGLE", minSelected: 1, maxSelected: 1, modifiers: [] },
        ],
      }),
      mkItem({
        id: "I_RIC",
        name: RICOTTA,
        variations: [
          { id: "V_RIC_FULL", name: "Full", priceCents: 700, inStock: true, pickupEnabled: true },
          { id: "V_RIC_MINI", name: "Mini", priceCents: 400, inStock: true, pickupEnabled: true },
        ],
        modifierLists: [
          { id: "ML_SHELL", name: "Shell", modifierType: "list", selectionType: "SINGLE", minSelected: 1, maxSelected: 1, modifiers: [] },
          { id: "ML_FILLING", name: "Filling", modifierType: "list", selectionType: "SINGLE", minSelected: 1, maxSelected: 1, modifiers: [] },
          { id: "ML_GARNISH", name: "Garnish", modifierType: "list", selectionType: "MULTIPLE", minSelected: 0, maxSelected: 3, modifiers: [] },
        ],
      }),
    ];

    const result = mergeCannoliItems(items, options);

    expect(result).toHaveLength(1);
    const composite = result[0];
    expect(composite.id).toBe("cannoli__composite");
    expect(composite.name).toBe("Cannoli");
    expect(composite.variations).toEqual([]);
    expect(composite.modifierLists).toEqual([]);
    expect(composite.cannoliFillings).toBeDefined();

    const [iceCream, ricotta] = composite.cannoliFillings!;
    expect(iceCream.key).toBe("ice_cream");
    expect(iceCream.label).toBe("Ice Cream");
    expect(iceCream.squareItemId).toBe("I_IC");
    expect(iceCream.variations.map((v) => v.id)).toEqual(["V_IC_FULL", "V_IC_MINI"]);
    expect(iceCream.modifierLists.map((m) => m.id)).toEqual(["ML_FLAVOR"]);

    expect(ricotta.key).toBe("ricotta");
    expect(ricotta.squareItemId).toBe("I_RIC");
    expect(ricotta.modifierLists.map((m) => m.id)).toEqual([
      "ML_SHELL",
      "ML_FILLING",
      "ML_GARNISH",
    ]);
  });

  it("renames the kit item and keeps it as a regular item", () => {
    const items: SnapshotItem[] = [
      mkItem({
        id: "I_IC",
        name: ICE_CREAM,
        variations: [
          { id: "V_IC", name: "Full", priceCents: 700, inStock: true, pickupEnabled: true },
        ],
      }),
      mkItem({
        id: "I_RIC",
        name: RICOTTA,
        variations: [
          { id: "V_RIC", name: "Full", priceCents: 700, inStock: true, pickupEnabled: true },
        ],
      }),
      mkItem({
        id: "I_KIT",
        name: KIT,
        variations: [
          { id: "V_KIT", name: "Set of 6", priceCents: 2000, inStock: true, pickupEnabled: true },
        ],
      }),
    ];
    const result = mergeCannoliItems(items, options);
    expect(result.map((i) => i.name)).toEqual(["Cannoli", "Cannoli Kit"]);
    const kit = result[1];
    expect(kit.id).toBe("I_KIT");
    expect(kit.cannoliFillings).toBeUndefined();
    expect(kit.variations).toHaveLength(1);
  });

  it("places the composite at the position of the first cannoli filling", () => {
    const items: SnapshotItem[] = [
      mkItem({ id: "I_COOK", name: "Cookies" }),
      mkItem({
        id: "I_IC",
        name: ICE_CREAM,
        variations: [{ id: "V1", name: "Full", priceCents: 700, inStock: true, pickupEnabled: true }],
      }),
      mkItem({ id: "I_GELATO", name: "Gelato" }),
      mkItem({
        id: "I_RIC",
        name: RICOTTA,
        variations: [{ id: "V2", name: "Full", priceCents: 700, inStock: true, pickupEnabled: true }],
      }),
    ];
    const result = mergeCannoliItems(items, options);
    expect(result.map((i) => i.name)).toEqual(["Cookies", "Cannoli", "Gelato"]);
  });

  it("passes through unrelated items unchanged", () => {
    const items: SnapshotItem[] = [
      mkItem({ id: "I_COOK", name: "Cookies", categoryName: "Cookies" }),
      mkItem({ id: "I_GELATO", name: "Gelato", categoryName: "Frozen" }),
    ];
    const result = mergeCannoliItems(items, options);
    expect(result).toEqual(items);
  });

  it("does not produce a composite when only one filling exists", () => {
    const items: SnapshotItem[] = [
      mkItem({
        id: "I_IC",
        name: ICE_CREAM,
        variations: [{ id: "V_IC", name: "Full", priceCents: 700, inStock: true, pickupEnabled: true }],
      }),
      mkItem({ id: "I_KIT", name: KIT, variations: [] }),
    ];
    const result = mergeCannoliItems(items, options);
    expect(result.map((i) => i.name)).toEqual([ICE_CREAM, "Cannoli Kit"]);
    expect(result[0].cannoliFillings).toBeUndefined();
  });
});
