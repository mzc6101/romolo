import type { ReviewsBundle } from "@/lib/reviews/types";
import { BUSINESS, SITE_URL, businessId, websiteId, logoUrl } from "./site";

type AggregateRating = {
  "@type": "AggregateRating";
  ratingValue: number;
  reviewCount: number;
  bestRating: 5;
  worstRating: 1;
};

const DAY_NAME_TO_SCHEMA: Record<string, string> = {
  Monday: "https://schema.org/Monday",
  Tuesday: "https://schema.org/Tuesday",
  Wednesday: "https://schema.org/Wednesday",
  Thursday: "https://schema.org/Thursday",
  Friday: "https://schema.org/Friday",
  Saturday: "https://schema.org/Saturday",
  Sunday: "https://schema.org/Sunday",
};

export function buildAggregateRating(
  bundle?: ReviewsBundle,
): AggregateRating | undefined {
  if (!bundle) return undefined;
  const g = bundle.google;
  const y = bundle.yelp;
  const gTotal = g?.total ?? 0;
  const yTotal = y?.total ?? 0;
  const total = gTotal + yTotal;
  if (total === 0) return undefined;
  const weighted = ((g?.rating ?? 0) * gTotal + (y?.rating ?? 0) * yTotal) / total;
  const rounded = Math.round(weighted * 10) / 10;
  return {
    "@type": "AggregateRating",
    ratingValue: rounded,
    reviewCount: total,
    bestRating: 5,
    worstRating: 1,
  };
}

export function buildLocalBusinessSchema(input?: { reviews?: ReviewsBundle }) {
  const aggregateRating = buildAggregateRating(input?.reviews);
  return {
    "@context": "https://schema.org",
    "@type": ["FoodEstablishment", "Bakery"],
    "@id": businessId,
    name: BUSINESS.legalName,
    alternateName: BUSINESS.alternateName,
    description: BUSINESS.description,
    slogan: BUSINESS.slogan,
    url: SITE_URL,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    image: [BUSINESS.heroImageUrl, logoUrl],
    logo: logoUrl,
    priceRange: BUSINESS.priceRange,
    servesCuisine: [...BUSINESS.servesCuisine],
    paymentAccepted: BUSINESS.paymentAccepted,
    currenciesAccepted: BUSINESS.currenciesAccepted,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.addressLocality,
      addressRegion: BUSINESS.addressRegion,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS.latitude,
      longitude: BUSINESS.longitude,
    },
    openingHoursSpecification: BUSINESS.hours.map((row) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: row.days.map((d) => DAY_NAME_TO_SCHEMA[d]),
      opens: row.opens,
      closes: row.closes,
    })),
    sameAs: [...BUSINESS.sameAs],
    areaServed: BUSINESS.areaServed.map((name) => ({ "@type": "City", name })),
    hasMenu: {
      "@type": "Menu",
      name: "Cannoli, Dolci & Gelato",
      url: `${SITE_URL}/#menu`,
      description:
        "Daily-rotating selection of handcrafted Sicilian cannoli, Italian pastries, and house-made gelato.",
    },
    foundingDate: "1968",
    ...(aggregateRating ? { aggregateRating } : {}),
  };
}

export function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteId,
    url: SITE_URL,
    name: BUSINESS.legalName,
    description: BUSINESS.description,
    inLanguage: "en-US",
    publisher: { "@id": businessId },
  };
}

export function buildBreadcrumbSchema(
  items: { name: string; url: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
