export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  badge?: string;
}

export const categories = [
  { id: "cannoli", name: "Cannoli", description: "Filled to order with our family recipe" },
  { id: "gelato", name: "Gelato & Ice Cream", description: "Wholesome Sicilian flavors" },
  { id: "desserts", name: "Pastries & Desserts", description: "More than just a cannoli shop" },
  { id: "kits", name: "Kits & Packages", description: "Take the magic home" },
];

export const menuItems: MenuItem[] = [
  // Cannoli
  {
    id: "mini-cannoli",
    name: "Mini Cannoli",
    description: "Cut in half and garnished on both sides, these bite-sized cannoli are perfect for any occasion.",
    price: 2.50,
    category: "cannoli",
    image: "/images/mini-cannoli.jpg",
    badge: "Popular",
  },
  {
    id: "full-cannoli",
    name: "Classic Cannoli",
    description: "Made fresh in shop from a recipe passed down for generations. Filled to order with our signature ricotta cream.",
    price: 4.50,
    category: "cannoli",
    image: "/images/classic-cannoli.jpg",
    badge: "Bestseller",
  },
  {
    id: "ice-cream-cannoli",
    name: "Ice Cream Cannoli",
    description: "A crisp cannoli shell filled with your choice of our handcrafted gelato. The perfect fusion.",
    price: 4.50,
    category: "cannoli",
    image: "/images/ice-cream-cannoli.jpg",
  },
  {
    id: "chocolate-cannoli",
    name: "Chocolate Cannoli",
    description: "Rich chocolate-dipped shell filled with our decadent chocolate ricotta cream and finished with cocoa.",
    price: 5.00,
    category: "cannoli",
    image: "/images/chocolate-cannoli.jpg",
  },
  {
    id: "pistachio-cannoli",
    name: "Pistachio Cannoli",
    description: "Filled with pistachio-infused ricotta cream and rolled in crushed Sicilian pistachios.",
    price: 5.00,
    category: "cannoli",
    image: "/images/pistachio-cannoli.jpg",
    badge: "New",
  },

  // Gelato & Ice Cream
  {
    id: "gelato-kiddie",
    name: "Gelato Scoop (Kiddie)",
    description: "A perfect little taste of our authentic Sicilian gelato. Choose from our rotating flavors.",
    price: 3.50,
    category: "gelato",
    image: "/images/gelato-kiddie.jpg",
  },
  {
    id: "gelato-medium",
    name: "Gelato Scoop (Medium)",
    description: "Up to two flavor selections of our handcrafted gelato made with wholesome ingredients.",
    price: 4.50,
    category: "gelato",
    image: "/images/gelato-medium.jpg",
    badge: "Popular",
  },
  {
    id: "tartufo",
    name: "Tartufo",
    description: "Chocolate and vanilla swirled together in a chocolate-dipped dome. A Sicilian classic.",
    price: 4.50,
    category: "gelato",
    image: "/images/tartufo.jpg",
  },
  {
    id: "spumoni-wedge",
    name: "Spumoni Wedge",
    description: "An explosion of flavors — the best way to experience this amazing Sicilian ice cream tradition.",
    price: 4.50,
    category: "gelato",
    image: "/images/spumoni.jpg",
    badge: "Signature",
  },
  {
    id: "milkshake",
    name: "Milkshake",
    description: "Thick, creamy, and made with your choice of our premium gelato flavors.",
    price: 7.50,
    category: "gelato",
    image: "/images/milkshake.jpg",
  },
  {
    id: "half-gallon",
    name: "Half Gallon",
    description: "Take home a half gallon of your favorite gelato flavor. Perfect for sharing.",
    price: 17.00,
    category: "gelato",
    image: "/images/half-gallon.jpg",
  },

  // Desserts
  {
    id: "tiramisu-small",
    name: "Tiramisu (Small)",
    description: "Nonna's special recipe — coffee-soaked cake with mascarpone filling and whipped cream. Serves 3–4.",
    price: 12.00,
    category: "desserts",
    image: "/images/tiramisu-small.jpg",
    badge: "Bestseller",
  },
  {
    id: "tiramisu-large",
    name: "Tiramisu (Large)",
    description: "Our beloved tiramisu in a generous portion. Perfect for gatherings. Serves 6–9.",
    price: 25.00,
    category: "desserts",
    image: "/images/tiramisu-large.jpg",
  },
  {
    id: "chocolate-banana",
    name: "Chocolate Covered Banana",
    description: "Fresh banana dipped in our rich, dark chocolate coating. A timeless treat.",
    price: 3.00,
    category: "desserts",
    image: "/images/chocolate-banana.jpg",
  },
  {
    id: "cucidati",
    name: "Cucidati",
    description: "Traditional Sicilian cookies filled with fig, date, brandy, marmalade, and chocolate.",
    price: 9.00,
    category: "desserts",
    image: "/images/cucidati.jpg",
  },
  {
    id: "rainbow-cookies",
    name: "Venetian Rainbow Cookies",
    description: "Colorful layered almond cookies with apricot jam and dark chocolate — a classic Italian favorite.",
    price: 9.00,
    category: "desserts",
    image: "/images/rainbow-cookies.jpg",
  },
  {
    id: "amaretti",
    name: "Amaretti",
    description: "Delicate Italian almond cookies, crisp on the outside, chewy within. Simply irresistible.",
    price: 9.00,
    category: "desserts",
    image: "/images/amaretti.jpg",
  },

  // Kits & Packages
  {
    id: "cannoli-6pack",
    name: "Cannoli (6 Pack)",
    description: "Six of our signature cannoli, filled fresh and ready to enjoy. Perfect for sharing.",
    price: 25.50,
    category: "kits",
    image: "/images/cannoli-6pack.jpg",
  },
  {
    id: "cannoli-12pack",
    name: "Cannoli (12 Pack)",
    description: "A dozen handcrafted cannoli for your next celebration or gathering.",
    price: 45.00,
    category: "kits",
    image: "/images/cannoli-12pack.jpg",
  },
  {
    id: "diy-kit",
    name: "DIY Cannoli Kit (6 Pack)",
    description: "Everything you need to prepare gourmet cannoli at home — shells, cream, and toppings included.",
    price: 25.50,
    category: "kits",
    image: "/images/diy-kit.jpg",
    badge: "Gift Idea",
  },
];
