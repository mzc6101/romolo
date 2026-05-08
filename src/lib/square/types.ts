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
  // Set on the synthetic "Cannoli" + "Cannoli Kit" composites. The frontend
  // renders a filling-type chip picker and the active filling supplies its
  // own variations + modifier lists. The top-level variations/modifierLists
  // arrays are empty in that case. The Set composite does NOT use this field
  // — its filling-type lives in a Square modifier list (see SetInfo).
  cannoliFillings?: CannoliFilling[];
  // Set on the synthetic "Cannoli Kit" composite. Carries the qty grouping
  // rules the UI enforces (step=groupSize, min=groupSize) and the per-kit fee
  // the order route applies. The fee is emitted as a separate ad-hoc line in
  // the Square order (Square modifier prices always scale with line qty, so
  // a modifier-based fee can't express "$2 per 6 cannolis").
  kit?: KitInfo;
  // Set on the "Cannoli Set" composite, which is now a passthrough of the
  // "Cannoli Online - Set" Square item (variations = sizes, modifier lists
  // include the filling-type chooser + per-filling rows). SetInfo carries the
  // ids the frontend needs to (a) drive conditional show/hide of the
  // ricotta/ice-cream-only lists based on the filling-type modifier
  // selection, and (b) seed the default recipe (Ricotta + Original /
  // Chocolate / Mixed Garnish) when a Set line is added.
  set?: SetInfo;
};

export type KitInfo = {
  perKitFeeCents: number;
  groupSize: number;
};

export type SetInfo = {
  // The "Cannoli Set Filling" modifier list — its single selection drives
  // conditional visibility of the per-filling lists below.
  fillingTypeListId: string;
  ricottaModifierId: string;
  iceCreamModifierId: string;
  // Modifier list ids that should only render when Ricotta is the active
  // filling type. Includes Shell, Filling (ricotta flavor), Garnish.
  ricottaOnlyListIds: string[];
  // Modifier list ids that should only render when Ice Cream is active.
  // Includes Ice Cream Flavor.
  iceCreamOnlyListIds: string[];
  // Pre-selections applied when a Set line is added: filling type = Ricotta
  // plus Ricotta's default flavor / shell / garnish. Mirrors the legacy
  // "Default" mode recipe so the user can complete a set in zero clicks
  // (just pick a size, hit Continue) but can change anything from there.
  defaultSelections: Array<{ listId: string; modifierIds: string[] }>;
};

// One filling-type branch under the composite "Cannoli" / "Cannoli Kit"
// items. `squareItemId` is the underlying Square ITEM the variations +
// modifiers come from; we keep it for traceability but order submission uses
// the variation id directly. Not used by the Set composite — Set carries
// filling type as a Square modifier instead.
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
