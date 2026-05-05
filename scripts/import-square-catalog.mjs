import { readFile } from "node:fs/promises";
import { SquareClient, SquareEnvironment, SquareError } from "square";
import { randomUUID } from "node:crypto";

const DEFAULT_CSV = "ML4GJ1ZD8PMTF_catalog-2026-05-03-2313.csv";
const MODIFIER_PREFIX = "Modifier Set - ";

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : fallback;
}

function flag(name) {
  return process.argv.includes(name);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  if (!headers) return [];

  return dataRows
    .filter((dataRow) => dataRow.some((value) => value.trim() !== ""))
    .map((dataRow) =>
      Object.fromEntries(headers.map((header, index) => [header, dataRow[index] ?? ""]))
    );
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function slug(value) {
  const normalized = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "object";
}

function yes(value) {
  return normalize(value) === "y";
}

function explicitYesNo(value) {
  const normalized = normalize(value);
  if (normalized === "y") return true;
  if (normalized === "n") return false;
  return undefined;
}

function cents(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/[$,]/g, ""));
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid price: ${value}`);
  }
  return BigInt(Math.round(parsed * 100));
}

function groupByItem(rows) {
  const groups = new Map();
  for (const row of rows) {
    const name = row["Item Name"]?.trim();
    if (!name) continue;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(row);
  }
  return groups;
}

async function listAllCatalogObjects(client, objectTypes) {
  const objects = [];
  let cursor;
  do {
    const response = await client.catalog.search({
      cursor,
      objectTypes,
      includeDeletedObjects: false,
      includeRelatedObjects: true,
      limit: 1000,
    });
    objects.push(...(response.objects ?? []), ...(response.relatedObjects ?? []));
    cursor = response.cursor;
  } while (cursor);

  const byId = new Map();
  for (const object of objects) {
    if (object?.id) byId.set(object.id, object);
  }
  return [...byId.values()];
}

function mapByName(objects, type, dataKey) {
  const map = new Map();
  for (const object of objects) {
    if (object.type !== type) continue;
    const name = object[dataKey]?.name;
    if (name) map.set(normalize(name), object);
  }
  return map;
}

function modifierColumnNames(row) {
  return Object.keys(row).filter((name) => name.startsWith(MODIFIER_PREFIX));
}

function existingVariationByName(item) {
  const variations = item?.itemData?.variations ?? [];
  const map = new Map();
  for (const variation of variations) {
    const name = variation?.itemVariationData?.name;
    if (name) map.set(normalize(name), variation);
  }
  return map;
}

function makeVariation(row, itemId, itemName, index, existing) {
  const name = row["Variation Name"]?.trim() || "Regular";
  const amount = cents(row.Price);
  if (amount == null) {
    throw new Error(`Missing price for ${itemName} / ${name}`);
  }

  const stockable = explicitYesNo(row.Stockable);
  const sellable = explicitYesNo(row.Sellable);
  const data = {
    itemId,
    name,
    pricingType: "FIXED_PRICING",
    priceMoney: { amount, currency: "USD" },
  };

  const sku = row.SKU?.trim();
  const gtin = row.GTIN?.trim();
  if (sku) data.sku = sku;
  if (gtin) data.upc = gtin;
  if (sellable !== undefined) data.sellable = sellable;
  if (stockable !== undefined) data.stockable = stockable;

  const variation = {
    type: "ITEM_VARIATION",
    id: existing?.id ?? `#romolo-var-${slug(itemName)}-${index + 1}-${slug(name)}`,
    itemVariationData: data,
  };
  if (existing?.version) variation.version = existing.version;
  return variation;
}

function makeItem(rows, categoryIdsByName, modifierIdsByName, existingItem) {
  const first = rows[0];
  const itemName = first["Item Name"].trim();
  const itemId = existingItem?.id ?? `#romolo-item-${slug(itemName)}`;
  const existingVariationMap = existingVariationByName(existingItem);
  const categoryName = first.Categories?.trim() || first["Reporting Category"]?.trim();
  const modifierListInfo = [];

  for (const columnName of modifierColumnNames(first)) {
    const modifierName = columnName.slice(MODIFIER_PREFIX.length);
    if (rows.some((row) => yes(row[columnName]))) {
      modifierListInfo.push({
        modifierListId: modifierIdsByName.get(normalize(modifierName)),
        enabled: true,
      });
    }
  }

  const itemData = {
    name: itemName,
    isArchived: yes(first.Archived),
    isAlcoholic: yes(first["Contains Alcohol"]),
    variations: rows.map((row, index) =>
      makeVariation(
        row,
        itemId,
        itemName,
        index,
        existingVariationMap.get(normalize(row["Variation Name"]?.trim() || "Regular"))
      )
    ),
  };

  const description = first.Description?.trim();
  const buyerFacingName = first["Customer-facing Name"]?.trim();
  if (description) itemData.description = description;
  if (buyerFacingName) itemData.buyerFacingName = buyerFacingName;
  if (categoryName) itemData.categories = [{ id: categoryIdsByName.get(normalize(categoryName)) }];
  if (modifierListInfo.length > 0) itemData.modifierListInfo = modifierListInfo;

  const item = {
    type: "ITEM",
    id: itemId,
    presentAtAllLocations: true,
    itemData,
  };
  if (existingItem?.version) item.version = existingItem.version;
  return item;
}

function summarizeSquareError(error) {
  if (error instanceof SquareError) {
    return JSON.stringify(error.body, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    );
  }
  return error?.stack ?? String(error);
}

async function main() {
  const token = process.env.SQUARE_ACCESS_TOKEN || process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Set SQUARE_ACCESS_TOKEN or SQUARE_SANDBOX_ACCESS_TOKEN before running.");
  }

  const csvPath = argValue("--csv", DEFAULT_CSV);
  const dryRun = flag("--dry-run");
  const rows = parseCsv(await readFile(csvPath, "utf8"));
  const groupedItems = groupByItem(rows);

  const client = new SquareClient({
    token,
    environment: SquareEnvironment.Sandbox,
  });

  const [{ locations }, catalogObjects] = await Promise.all([
    client.locations.list(),
    listAllCatalogObjects(client, ["CATEGORY", "MODIFIER_LIST", "ITEM"]),
  ]);

  const categoriesByName = mapByName(catalogObjects, "CATEGORY", "categoryData");
  const modifiersByName = mapByName(catalogObjects, "MODIFIER_LIST", "modifierListData");
  const itemsByName = mapByName(catalogObjects, "ITEM", "itemData");

  const wantedCategoryNames = new Set(
    rows
      .map((row) => row.Categories?.trim() || row["Reporting Category"]?.trim())
      .filter(Boolean)
  );
  const wantedModifierNames = new Set();
  for (const row of rows) {
    for (const columnName of modifierColumnNames(row)) {
      if (yes(row[columnName])) wantedModifierNames.add(columnName.slice(MODIFIER_PREFIX.length));
    }
  }

  const missingModifiers = [...wantedModifierNames].filter(
    (name) => !modifiersByName.has(normalize(name))
  );
  if (missingModifiers.length > 0) {
    throw new Error(
      `Missing modifier lists in sandbox: ${missingModifiers.join(", ")}. Add them first or rename them to match the CSV.`
    );
  }

  const missingCategories = [...wantedCategoryNames].filter(
    (name) => !categoriesByName.has(normalize(name))
  );

  console.log(`CSV rows: ${rows.length}`);
  console.log(`Items to import: ${groupedItems.size}`);
  console.log(`Existing sandbox locations: ${(locations ?? []).map((l) => `${l.name} (${l.id})`).join(", ")}`);
  console.log(`Missing categories to create: ${missingCategories.length || "none"}`);
  console.log(`Modifier lists matched: ${wantedModifierNames.size}`);

  if (dryRun) {
    console.log("Dry run complete; no Square writes were made.");
    return;
  }

  if (missingCategories.length > 0) {
    const categoryObjects = missingCategories.map((name) => ({
      type: "CATEGORY",
      id: `#romolo-category-${slug(name)}`,
      presentAtAllLocations: true,
      categoryData: { name },
    }));
    const response = await client.catalog.batchUpsert({
      idempotencyKey: `romolo-categories-${randomUUID()}`,
      batches: [{ objects: categoryObjects }],
    });
    for (const mapping of response.idMappings ?? []) {
      const name = missingCategories.find(
        (categoryName) => mapping.clientObjectId === `#romolo-category-${slug(categoryName)}`
      );
      if (name && mapping.objectId) {
        categoriesByName.set(normalize(name), { id: mapping.objectId });
      }
    }
  }

  const categoryIdsByName = new Map(
    [...categoriesByName.entries()].map(([name, category]) => [name, category.id])
  );
  const modifierIdsByName = new Map(
    [...modifiersByName.entries()].map(([name, modifier]) => [name, modifier.id])
  );

  const itemObjects = [...groupedItems.values()].map((groupRows) =>
    makeItem(
      groupRows,
      categoryIdsByName,
      modifierIdsByName,
      itemsByName.get(normalize(groupRows[0]["Item Name"]))
    )
  );

  const response = await client.catalog.batchUpsert({
    idempotencyKey: `romolo-items-${randomUUID()}`,
    batches: [{ objects: itemObjects }],
  });

  const createdOrUpdated = response.objects?.filter((object) => object.type === "ITEM") ?? [];
  console.log(`Imported items: ${createdOrUpdated.length}`);
  for (const item of createdOrUpdated) {
    console.log(`- ${item.itemData?.name} (${item.id})`);
  }
}

main().catch((error) => {
  console.error(summarizeSquareError(error));
  process.exit(1);
});
