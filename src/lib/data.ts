/**
 * NOTE (Square integration milestone):
 * The exports in this file are no longer used by the active Order Flow.
 * They remain as Cannoli scaffolding (`MENU_DATA` items, `INITIAL_FLAVORS`,
 * `DELIVERY_ZONES`, `REVIEWS`, `fmt`) for parts of the homepage that still
 * reference them — see Menu.tsx, Testimonials.tsx — and for re-use when
 * Cannoli ordering is wired in. Do not add new menu items here. Live order
 * data comes from `loadSnapshot()` in `app/page.tsx`, which calls
 * `getCatalog()` and `getOpenPeriods()` from `lib/square/`.
 */

/** Three images shown in the menu item lightbox gallery. */
export type MenuGalleryUrls = readonly [string, string, string];

/** A single read-only option group displayed in the gallery modal. The actual
 * orderable choices live in Square — these mirror them for marketing copy. */
export type MenuOptionGroup = {
  label: string;
  choices: readonly string[];
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Optional thumbnail in the menu grid */
  imageUrl?: string;
  /** Full gallery for this item (lightbox). */
  galleryUrls: MenuGalleryUrls;
  /** Read-only ordering options shown inside the gallery modal. */
  options?: readonly MenuOptionGroup[];
};

export type MenuCategory = {
  category: string;
  squareSyncedAt: string;
  items: MenuItem[];
};

// Shared by Cannoli — Full / Mini / Kit. All three composites carry the same
// modifier surface in Square (ricotta filling/shell/garnish + ice cream
// filling alternative); reusing one constant keeps copy in sync.
const CANNOLI_OPTIONS: readonly MenuOptionGroup[] = [
  {
    label: "Ricotta filling",
    choices: [
      "Original",
      "Chocolate",
      "Tiramisu",
      "Pistachio",
      "Lemon Cello",
      "Strawberry",
    ],
  },
  { label: "Ricotta shell", choices: ["Chocolate", "Plain"] },
  {
    label: "Ricotta garnish",
    choices: ["Pistachio", "Chocolate Chips", "Toffee", "Cherries"],
  },
  {
    label: "Ice cream filling",
    choices: ["Vanilla", "Chocolate", "Coffee", "Mint", "Strawberry"],
  },
] as const;

// Shared by Ice Cream + Milkshake — both pull from Square's "Ice Cream
// Flavors" modifier list.
const ICE_CREAM_FLAVORS: readonly string[] = [
  "Vanilla",
  "Chocolate",
  "Coffee",
  "Mint Chip",
  "Strawberry",
  "Berry White",
  "Unicorn",
  "Spumoni",
] as const;

export const MENU_DATA: MenuCategory[] = [
  {
    category: "Cannoli",
    squareSyncedAt: "2 min ago",
    items: [
      {
        id: "cannoli-full",
        name: "Cannoli — Full Size",
        description: "Crispy shell filled to order with sweet ricotta",
        price: 4.5,
        imageUrl:
          "https://res.cloudinary.com/dcthz84ws/image/upload/q_auto/f_auto/v1777914813/_N8Z0653_lb1e3o.jpg",
        galleryUrls: [
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1775679870/_N8Z0944_odj3da.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1775678635/_N8Z0762_bsvral.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1778208102/_N8Z0653_yul3bg.jpg",
        ],
        options: CANNOLI_OPTIONS,
      },
      {
        id: "cannoli-mini",
        name: "Cannoli — Mini",
        description: "Bite-sized, perfect for sharing",
        price: 2.25,
        imageUrl:
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777328556/_N8Z0787_acdfse.jpg",
        galleryUrls: [
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1778208836/_N8Z0647_du5jdg.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777328556/_N8Z0787_acdfse.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1778208836/_N8Z0658_eqz1yw.jpg",
        ],
        options: CANNOLI_OPTIONS,
      },
      {
        id: "cannoli-kit",
        name: "Cannoli Kit",
        description:
          "Shells and filling to assemble at home — sold in multiples of 6",
        price: 18.0,
        imageUrl:
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1775679842/_N8Z0606_wcehwu.jpg",
        galleryUrls: [
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1778208596/_N8Z0617_rlml9t.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1778208180/_N8Z0841_ym5wta.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1778208645/_N8Z0577_obul7k.jpg",
        ],
        options: CANNOLI_OPTIONS,
      },
    ],
  },
  {
    category: "Desserts",
    squareSyncedAt: "2 min ago",
    items: [
      {
        id: "choc-banana",
        name: "Chocolate Banana",
        description: "Frozen banana dipped in rich chocolate",
        price: 3.5,
        imageUrl:
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777328622/_N8Z0931_axesp2.jpg",
        galleryUrls: [
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777328622/_N8Z0931_axesp2.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1778208978/_N8Z0618_auxdeb.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1778208979/_N8Z0928_q1jbrx.jpg",
        ],
      },
      {
        id: "cookie",
        name: "Cookie",
        description: "Amaretti, Rainbow, or Cucidati",
        price: 2.0,
        imageUrl:
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777328740/_N8Z0782_lir3xp.jpg",
        galleryUrls: [
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777328740/_N8Z0782_lir3xp.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1778209133/_N8Z0952_wtpsj1.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1778209143/_N8Z0947_qejilj.jpg",
        ],
        options: [
          {
            label: "Flavor",
            choices: ["Amaretti", "Rainbow", "Cucidati"],
          },
        ],
      },
      {
        id: "spumoni",
        name: "Spumoni Wedge",
        description: "Tri-color ice cream with candied fruit & nuts",
        price: 5.5,
        imageUrl:
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777328772/_N8Z0935_ggdfvc.jpg",
        galleryUrls: [
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777328772/_N8Z0935_ggdfvc.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1780880978/Gemini_Generated_Image_5tmzbs5tmzbs5tmz_d8tulb.png",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1780881048/Gemini_Generated_Image_kl1xsjkl1xsjkl1x_r4oyv5.png",
        ],
      },
      {
        id: "tartufi",
        name: "Tartufi",
        description: "Chocolate-coated truffle with a molten center",
        price: 6.0,
        imageUrl:
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777328834/_N8Z0941_g0bjmw.jpg",
        galleryUrls: [
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777328834/_N8Z0941_g0bjmw.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1778209283/_N8Z0939_th8imo.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1780881139/Gemini_Generated_Image_9ais9g9ais9g9ais_kwgkg4.png",
        ],
      },
      {
        id: "tiramisu",
        name: "Tiramisu",
        description: "Espresso ladyfingers layered with mascarpone",
        price: 7.5,
        imageUrl:
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777328873/_N8Z0797-Edit_jvlpx4.jpg",
        galleryUrls: [
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777328873/_N8Z0797-Edit_jvlpx4.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1778209384/_N8Z0804_cmrtim.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1778209398/_N8Z0794-Edit_ghtqgl.jpg",
        ],
        options: [{ label: "Size", choices: ["Small", "Large"] }],
      },
    ],
  },
  {
    category: "Frozen Treats",
    squareSyncedAt: "2 min ago",
    items: [
      {
        id: "icecream",
        name: "Ice Cream",
        description: "Italian-style, rotating flavors",
        price: 4.0,
        imageUrl:
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777328923/_N8Z0923_t1i9rl.jpg",
        galleryUrls: [
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1778209506/_N8Z0814_kgm7vc.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1778209526/_N8Z0808_bqtskg.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1778209505/_N8Z0809_aqicfp.jpg",
        ],
        options: [
          {
            label: "Size",
            choices: ["Small", "Medium", "Pint", "Quart", "Half Gallon"],
          },
          { label: "Flavor", choices: ICE_CREAM_FLAVORS },
        ],
      },
      {
        id: "milkshake",
        name: "Milkshake",
        description: "Thick, blended with house-made ice cream",
        price: 6.5,
        galleryUrls: [
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777328923/_N8Z0923_t1i9rl.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777328873/_N8Z0797-Edit_jvlpx4.jpg",
          "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777328622/_N8Z0931_axesp2.jpg",
        ],
        options: [{ label: "Flavor", choices: ICE_CREAM_FLAVORS }],
      },
    ],
  },
];

export type Flavor = {
  id: string;
  name: string;
  available: boolean;
  today: boolean;
  color: string;
};

export const INITIAL_FLAVORS: Flavor[] = [
  { id: "original", name: "Original Ricotta", available: true, today: true, color: "#f7eee0" },
  { id: "chocolate", name: "Chocolate Chip", available: true, today: false, color: "#a87354" },
  { id: "pistachio", name: "Pistachio", available: true, today: false, color: "#a8c08a" },
  { id: "strawberry", name: "Strawberry", available: true, today: false, color: "#e89aa0" },
  { id: "limoncello", name: "Limoncello", available: false, today: false, color: "#f5e188" },
  { id: "espresso", name: "Espresso", available: true, today: false, color: "#5a3f30" },
  { id: "nutella", name: "Nutella Swirl", available: false, today: false, color: "#7a4a2e" },
  { id: "candied-orange", name: "Candied Orange", available: true, today: false, color: "#e8a35a" },
];

export type Review = {
  source: "google";
  author: string;
  avatar: string;
  rating: number;
  date: string;
  text: string;
};

export const REVIEWS: Review[] = [
  {
    source: "google",
    author: "Maria Costanza",
    avatar: "MC",
    rating: 5,
    date: "2 weeks ago",
    text: "The best cannoli I've ever had outside of Sicily. That shell — my God — it shatters like a dream. Romolo's is the real deal. Joe filled mine while I watched and the ricotta was so fresh.",
  },
  {
    source: "google",
    author: "The Bianchi Family",
    avatar: "BF",
    rating: 5,
    date: "3 weeks ago",
    text: "We've been ordering the Cannoli Box for every family gathering for the past fifteen years. It wouldn't be a celebration without Romolo's. The pistachio rotation last weekend was unreal.",
  },
];

export type DeliveryZone = {
  id: string;
  label: string;
  radius: string;
  fee: number | null;
  eta: string;
  auto: boolean;
};

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: "local",
    label: "Local — San Mateo / Foster City",
    radius: "0–8 mi",
    fee: 8,
    eta: "30–45 min",
    auto: true,
  },
  {
    id: "peninsula",
    label: "Peninsula — Redwood City to South SF",
    radius: "8–25 mi",
    fee: 18,
    eta: "45–75 min",
    auto: true,
  },
  {
    id: "extended",
    label: "Extended — SF / South Bay",
    radius: "25–55 mi",
    fee: 35,
    eta: "75–120 min",
    auto: true,
  },
  {
    id: "longhaul",
    label: "Long distance — Santa Cruz, Napa, beyond",
    radius: "55+ mi",
    fee: null,
    eta: "Call to coordinate",
    auto: false,
  },
];

export const fmt = (n: number) => "$" + n.toFixed(2);
