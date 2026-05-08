// Discount / pricing-rule / product-set definitions live on Square. The
// frontend no longer mirrors them — totals come from POST
// /v2/orders/calculate (see src/lib/square/calculate.ts), which evaluates
// AUTOMATIC pricing rules server-side and returns the authoritative
// subtotal / discount / total.
export type MenuSnapshot = {
  fetchedAt: string;
  locationId: string;
  currency: "USD";
  items: SnapshotItem[];
  hours: OpenPeriods;
  location: LocationProfile;
};

// Display-ready location info derived from Square's `locations.get`. `address`
// is a single human-readable line for rendering; `mapsQuery` is what to drop
// after `?destination=` in the Google Maps directions URL — coordinates when
// Square has them (most reliable), falling back to the URL-encoded address.
export type LocationProfile = {
  address: string;
  mapsQuery: string;
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
  // Set on the synthetic "Cannoli Set" composite. Fixed-recipe Ricotta build
  // (Ricotta filling + Chocolate shell + Mixed garnish) sold in three sizes
  // (6 Full / 12 Full / 24 Mini). The user picks a size; recipe and qty are
  // not editable. Modifiers are auto-applied via line.modifiers at addLine
  // time and flushed to Square unchanged. Pricing is variation × qty (no
  // set fee, no ad-hoc line).
  set?: SetInfo;
};

export type KitInfo = {
  perKitFeeCents: number;
  groupSize: number;
};

// One pickable size on the Cannoli Set composite. variationId + qty pair
// resolves uniquely (e.g. 6 Full and 12 Full share variationId but differ
// in qty), so any (variationId, qty) match identifies the option. inStock
// is captured at catalog-build time from the underlying Ricotta variation.
export type SetOption = {
  key: string;
  label: string;
  variationId: string;
  qty: number;
  // Per-cannoli price captured from the underlying Ricotta variation at
  // catalog-build time. The total set subtotal is priceCents × qty (no set
  // fee). Square recomputes pricing server-side at order-create from the
  // variationId, so this is purely for the UI subtotal display.
  priceCents: number;
  inStock: boolean;
  // Ice Cream equivalent for this size, used by Customize mode when the
  // user switches the filling type. Omitted when the Ice Cream item lacks a
  // matching variation (Customize → Ice Cream chip will then reflect the
  // size as out-of-stock for that filling).
  iceCream?: {
    variationId: string;
    priceCents: number;
    inStock: boolean;
  };
};

// Modifier auto-applied to every Cannoli Set line (Filling=Ricotta,
// Shell=Chocolate, Garnish=Mixed). Lookup is by name from the Ricotta
// item's modifier lists at catalog-build time. soldOut mirrors
// SnapshotModifier.soldOut so lineValid can reject without a second
// lookup.
export type AutoModifierRef = {
  modifierListId: string;
  modifierId: string;
  soldOut?: boolean;
};

export type SetInfo = {
  options: SetOption[];
  autoModifiers: AutoModifierRef[];
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
  // True when ModifierLocationOverrides.sold_out is set for our location in
  // Square. Set during catalog post-processing in catalog.ts.
  soldOut?: boolean;
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
  // Order-level customer note (entered on the Review step). Threads through
  // to Square as order.note — the kitchen ticket header. Per-line freeText
  // notes still attach to their respective line items separately.
  note?: string;
  lines: Array<{
    // Stable per-cart-line id passed through to Square as line_item.uid so
    // the calculate response can be joined back to cart lines for per-line
    // post-discount totals (the cannoli line and its kit-fee sibling both
    // carry uids derived from this — see buildOrderLineItems).
    uid?: string;
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
    // POS visibility on the cannoli line itself is handled by the
    // "Cannoli Kit" line-note prefix (see buildLinePayload), same pattern
    // as the Set composite — no catalog modifier marker is attached.
    kitModifier?: {
      perKitFeeCents: number;
      count: number;
    };
  }>;
};
