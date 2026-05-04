import { describe, it, expect } from "vitest";
import {
  serializeItem,
  serializeModifierList,
  isCannoliCategory,
} from "./serializers";

describe("isCannoliCategory", () => {
  it("returns true for category names containing Cannoli (any case)", () => {
    expect(isCannoliCategory("Cannoli")).toBe(true);
    expect(isCannoliCategory("cannoli")).toBe(true);
    expect(isCannoliCategory("Cannoli Online")).toBe(true);
  });

  it("returns false for unrelated categories", () => {
    expect(isCannoliCategory("Ice Cream")).toBe(false);
    expect(isCannoliCategory("Cookie")).toBe(false);
    expect(isCannoliCategory(undefined)).toBe(false);
  });
});

describe("serializeModifierList", () => {
  it("maps a SINGLE-select Square modifier list", () => {
    const result = serializeModifierList(
      {
        type: "MODIFIER_LIST",
        id: "ML1",
        modifierListData: {
          name: "Cookie Flavors",
          selectionType: "SINGLE",
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
      selectionType: "SINGLE",
      minSelected: 1,
      maxSelected: 1,
      modifiers: [{ id: "M1", name: "Amaretti", priceCents: 0 }],
    });
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
      selectionType: "SINGLE" as const,
      minSelected: 1,
      maxSelected: 1,
      modifiers: [{ id: "M1", name: "Amaretti", priceCents: 0 }],
    },
  ];

  it("maps an item with one variation and one attached modifier list", () => {
    const result = serializeItem(baseItem, "Cookie", modifierLists, {
      // empty stock map ⇒ in stock by default for non-stockable
    });
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
    const result = serializeItem(stockableItem, "Ice Cream", [], {
      V2: 0,
    });
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
    const result = serializeItem(stockableItem, "Ice Cream", [], {
      V3: 5,
    });
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
        selectionType: "SINGLE" as const,
        minSelected: 1,
        maxSelected: 1,
        modifiers: [],
      },
      {
        id: "ML_OFF",
        name: "Off",
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
