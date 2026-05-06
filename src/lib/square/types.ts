export type MenuSnapshot = {
  fetchedAt: string;
  locationId: string;
  currency: "USD";
  items: SnapshotItem[];
  hours: OpenPeriods;
  discounts: SnapshotDiscount[];
  pricingRules: SnapshotPricingRule[];
  productSets: SnapshotProductSet[];
};

export type SnapshotDiscount = {
  id: string;
  name: string;
  type: "FIXED_AMOUNT" | "FIXED_PERCENTAGE" | "VARIABLE_AMOUNT" | "VARIABLE_PERCENTAGE";
  // Set when type === "FIXED_AMOUNT"
  amountCents?: number;
  // Set when type === "FIXED_PERCENTAGE" — Square stores it as a string
  // ("10.0" = 10%); we normalize to a number.
  percentage?: number;
};

export type SnapshotProductSet = {
  id: string;
  productIdsAny?: string[];
  productIdsAll?: string[];
  allProducts?: boolean;
  quantityMin?: number;
  quantityMax?: number;
  quantityExact?: number;
};

export type SnapshotPricingRule = {
  id: string;
  discountId: string;
  matchProductsId?: string;
  excludeProductsId?: string;
  applicationMode: "AUTOMATIC" | "MANUAL";
  discountTargetScope: "LINE_ITEM" | "ORDER";
  validFromDate?: string;
  validUntilDate?: string;
  validFromLocalTime?: string;
  validUntilLocalTime?: string;
};

export type SnapshotItem = {
  id: string;
  name: string;
  description?: string;
  categoryName?: string;
  variations: SnapshotVariation[];
  modifierLists: SnapshotModifierList[];
  // Composite-only. When set, the frontend renders a filling-type chip picker
  // and the active filling supplies its own variations + modifier lists. The
  // top-level variations/modifierLists arrays are empty in that case.
  cannoliFillings?: CannoliFilling[];
  // Set on the synthetic "Cannoli Kit" composite. Carries the qty grouping
  // rules the UI enforces (step=groupSize, min=groupSize) and the per-kit fee
  // the order route applies. The fee is emitted as a separate ad-hoc line in
  // the Square order (Square modifier prices always scale with line qty, so
  // a modifier-based fee can't express "$2 per 6 cannolis").
  kit?: KitInfo;
};

export type KitInfo = {
  perKitFeeCents: number;
  groupSize: number;
};

// One filling-type branch under the composite "Cannoli" item. `squareItemId`
// is the underlying Square ITEM the variations + modifiers come from; we keep
// it for traceability but order submission uses the variation id directly.
export type CannoliFilling = {
  key: string;          // stable e.g. "ice_cream", "ricotta"
  label: string;        // user-facing e.g. "Ice Cream", "Ricotta"
  squareItemId: string;
  variations: SnapshotVariation[];
  modifierLists: SnapshotModifierList[];
};

export type SnapshotVariation = {
  id: string;
  name: string;
  priceCents: number;
  inStock: boolean;
  pickupEnabled: boolean;
};

export type SnapshotModifierList = {
  id: string;
  name: string;
  // "list" = pick from a fixed set of modifiers; "text" = free-text input
  // (Square modifier_type=TEXT — no `modifiers`, used for notes/instructions).
  modifierType: "list" | "text";
  selectionType: "SINGLE" | "MULTIPLE";
  minSelected: number;
  maxSelected: number | null;
  modifiers: SnapshotModifier[];
  // Only set when modifierType === "text"
  maxLength?: number;
  textRequired?: boolean;
};

export type SnapshotModifier = {
  id: string;
  name: string;
  priceCents: number;
};

export type OpenPeriods = {
  byWeekday: Record<number, Array<{ openLocal: string; closeLocal: string }>>;
  timezone: string;
};

export type OrderResult =
  | { status: "ok"; orderId: string; confirmation: string }
  | { status: "out_of_stock"; itemNames: string[] }
  | { status: "card_declined"; message: string }
  | { status: "invalid_payload"; field: string; message: string }
  | { status: "square_error"; code: string; message: string };

export type OrderRequest = {
  idempotencyKey: string;
  sourceId: string;
  pickupAt: string;
  contact: { name: string; phone: string; email: string };
  lines: Array<{
    catalogObjectId: string;
    quantity: number;
    modifiers: string[];
    // Free-text customer note for the line (e.g. from a TEXT modifier list).
    // Surfaces in Square dashboard under the line item.
    note?: string;
    // Set when the line came from the Cannoli Kit composite. The server
    // emits an ad-hoc Square line item (name="Cannoli Kit", basePriceMoney=
    // perKitFeeCents, quantity=count) right after the cannoli line. Discount
    // rules target the cannoli product set so they ignore the ad-hoc line.
    kitModifier?: {
      perKitFeeCents: number;
      count: number;
    };
  }>;
};
