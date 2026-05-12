// Single source of truth for site-level SEO/GEO facts. Anything that needs
// the business NAP, hours, or canonical URL should import from here.

const RAW_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://romoloscannoli.com";

export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, "");

export const BUSINESS = {
  legalName: "Romolo's Cannoli",
  alternateName: "Romolo's",
  slogan: "Authentic Sicilian cannoli, dolci, and gelato since 1968",
  description:
    "Third-generation family-owned Sicilian bakery in San Mateo. Hand-filled cannoli, traditional dolci, and house-made gelato.",
  streetAddress: "81 W. 37th Ave.",
  addressLocality: "San Mateo",
  addressRegion: "CA",
  postalCode: "94403",
  addressCountry: "US",
  telephone: "+1-650-574-0625",
  email: "info@romoloscannoli.com",
  // Coordinates verified via OpenStreetMap Nominatim against the W. 37th Ave address.
  latitude: 37.5302,
  longitude: -122.3047,
  priceRange: "$$",
  servesCuisine: ["Italian", "Sicilian", "Dessert"],
  paymentAccepted: "Cash, Credit Card",
  currenciesAccepted: "USD",
  // Schema.org openingHoursSpecification rows.
  hours: [
    { days: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], opens: "11:00", closes: "18:00" },
    { days: ["Sunday"], opens: "12:00", closes: "16:00" },
    // Monday closed — represented by absence.
  ],
  sameAs: [
    "https://www.instagram.com/romoloscannoli/",
    "https://www.facebook.com/RomolosCannoli/",
  ],
  areaServed: ["San Mateo", "Hillsdale", "Foster City", "Burlingame", "San Mateo County"],
  heroImageUrl:
    "https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1775678635/_N8Z0762_bsvral.jpg",
  logoPath: "/RmLogo.png",
} as const;

export const businessId = `${SITE_URL}/#business`;
export const websiteId = `${SITE_URL}/#website`;
export const logoUrl = `${SITE_URL}${BUSINESS.logoPath}`;
