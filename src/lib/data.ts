export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
};

export type MenuCategory = {
  category: string;
  squareSyncedAt: string;
  items: MenuItem[];
};

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
      },
      {
        id: "cannoli-mini",
        name: "Cannoli — Mini",
        description: "Bite-sized, sold by the dozen for sharing",
        price: 2.25,
      },
      {
        id: "cannoli-kit",
        name: "Cannoli Kit",
        description:
          "Shells and filling to assemble at home — sold in multiples of 6",
        price: 18.0,
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
      },
      {
        id: "cookie",
        name: "Cookie",
        description: "Amaretti, Rainbow, or Cucidati",
        price: 2.0,
      },
      {
        id: "spumoni",
        name: "Spumoni Wedge",
        description: "Tri-color ice cream with candied fruit & nuts",
        price: 5.5,
      },
      {
        id: "tartufi",
        name: "Tartufi",
        description: "Chocolate-coated truffle with a molten center",
        price: 6.0,
      },
      {
        id: "tiramisu",
        name: "Tiramisu",
        description: "Espresso ladyfingers layered with mascarpone",
        price: 7.5,
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
      },
      {
        id: "milkshake",
        name: "Milkshake",
        description: "Thick, blended with house-made ice cream",
        price: 6.5,
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
  source: "google" | "yelp";
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
    text: "The best cannoli I've ever had outside of Sicily. That shell — my God — it shatters like a dream. Romolo's is the real deal. Joey filled mine while I watched and the ricotta was so fresh.",
  },
  {
    source: "yelp",
    author: "Giuseppe T.",
    avatar: "GT",
    rating: 5,
    date: "1 month ago",
    text: "I brought my Nonna here and she cried. She said it tasted exactly like home. That's the highest compliment you can get. We left with a dozen and they didn't make it back to the car.",
  },
  {
    source: "google",
    author: "The Bianchi Family",
    avatar: "BF",
    rating: 5,
    date: "3 weeks ago",
    text: "We've been ordering the Cannoli Box for every family gathering for the past fifteen years. It wouldn't be a celebration without Romolo's. The pistachio rotation last weekend was unreal.",
  },
  {
    source: "yelp",
    author: "Aaron L.",
    avatar: "AL",
    rating: 5,
    date: "2 months ago",
    text: "Stopped in on a whim — ended up coming back three days in a row. The strawberry filling is something else when they have it. Worth the drive from the city.",
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
