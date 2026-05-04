import { describe, it, expect } from "vitest";
import {
  serializeItem,
  serializeModifierList,
  splitItemByFormFactor,
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

  it("splitItemByFormFactor: splits 'Cannoli Online' into Full/Mini/Kit", () => {
    const cannoli: SnapshotItem = {
      id: "ITEM_CANNOLI",
      name: "Cannoli Online",
      categoryName: "Cannoli",
      description: undefined,
      variations: [
        { id: "V_FULL_6", name: "Full Size - Set of 6", priceCents: 3900, inStock: true, pickupEnabled: true },
        { id: "V_FULL_12", name: "Full Size - Set of 12", priceCents: 7200, inStock: true, pickupEnabled: true },
        { id: "V_FULL_1", name: "Full Size - Single", priceCents: 700, inStock: true, pickupEnabled: true },
        { id: "V_MINI_1", name: "Mini Size - Single", priceCents: 400, inStock: true, pickupEnabled: true },
        { id: "V_MINI_12", name: "Mini Size - Set of 12", priceCents: 4800, inStock: true, pickupEnabled: true },
        { id: "V_MINI_24", name: "Mini Size - Set of 24", priceCents: 8400, inStock: true, pickupEnabled: true },
        { id: "V_KIT_6", name: "Kit - Set of 6", priceCents: 200, inStock: true, pickupEnabled: true },
      ],
      modifierLists: [
        {
          id: "ML_FILL",
          name: "Cannoli Filling",
          modifierType: "list",
          selectionType: "SINGLE",
          minSelected: 1,
          maxSelected: 1,
          modifiers: [],
        },
      ],
    };

    const result = splitItemByFormFactor(cannoli, {
      "Full Size": "Full Size Cannoli",
      "Mini Size": "Mini Size Cannoli",
      "Kit": "Cannoli Kit",
    });

    expect(result.map((i) => i.name)).toEqual([
      "Full Size Cannoli",
      "Mini Size Cannoli",
      "Cannoli Kit",
    ]);

    const [full, mini, kit] = result;
    expect(full.variations.map((v) => v.name)).toEqual([
      "Set of 6",
      "Set of 12",
      "Single",
    ]);
    expect(full.variations.map((v) => v.id)).toEqual([
      "V_FULL_6",
      "V_FULL_12",
      "V_FULL_1",
    ]);
    expect(full.id).toBe("ITEM_CANNOLI__full_size");
    expect(mini.variations.map((v) => v.name)).toEqual([
      "Single",
      "Set of 12",
      "Set of 24",
    ]);
    expect(kit.variations.map((v) => v.name)).toEqual(["Set of 6"]);
    // All split items share the same modifier lists
    expect(full.modifierLists).toBe(cannoli.modifierLists);
    expect(mini.modifierLists).toBe(cannoli.modifierLists);
    expect(kit.modifierLists).toBe(cannoli.modifierLists);
  });

  it("splitItemByFormFactor: returns the original item when names don't match the pattern", () => {
    const item: SnapshotItem = {
      id: "ITEM_X",
      name: "Cookies",
      categoryName: "Sweets",
      description: undefined,
      variations: [
        { id: "V1", name: "Regular", priceCents: 200, inStock: true, pickupEnabled: true },
      ],
      modifierLists: [],
    };
    const result = splitItemByFormFactor(item);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(item);
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
