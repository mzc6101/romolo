import { describe, expect, it } from "vitest";
import type { ReviewsBundle } from "@/lib/reviews/types";
import {
  buildAggregateRating,
  buildBreadcrumbSchema,
  buildLocalBusinessSchema,
  buildWebSiteSchema,
} from "./schema";

const emptyBundle: ReviewsBundle = { reviews: [], source: "fallback" };

describe("buildAggregateRating", () => {
  it("returns undefined when no review totals are present", () => {
    expect(buildAggregateRating()).toBeUndefined();
    expect(buildAggregateRating(emptyBundle)).toBeUndefined();
  });

  it("emits aggregate from google totals", () => {
    const rating = buildAggregateRating({
      ...emptyBundle,
      google: { rating: 4.8, total: 200 },
    });
    expect(rating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.8,
      reviewCount: 200,
      bestRating: 5,
      worstRating: 1,
    });
  });

  it("rounds rating to one decimal", () => {
    const rating = buildAggregateRating({
      ...emptyBundle,
      google: { rating: 4.85, total: 271 },
    });
    expect(rating?.ratingValue).toBe(4.9);
    expect(rating?.reviewCount).toBe(271);
  });
});

describe("buildLocalBusinessSchema", () => {
  it("emits required LocalBusiness fields", () => {
    const schema = buildLocalBusinessSchema();
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toEqual(["FoodEstablishment", "Bakery"]);
    expect(schema["@id"]).toMatch(/#business$/);
    expect(schema.name).toBe("Romolo's Cannoli");
    expect(schema.address.streetAddress).toBe("81 W. 37th Ave.");
    expect(schema.address.postalCode).toBe("94403");
    expect(schema.geo.latitude).toBeCloseTo(37.53, 1);
    expect(schema.telephone).toBe("+1-650-574-0625");
  });

  it("omits aggregateRating when reviews are missing", () => {
    const schema = buildLocalBusinessSchema();
    expect("aggregateRating" in schema).toBe(false);
  });

  it("attaches aggregateRating when reviews are present", () => {
    const schema = buildLocalBusinessSchema({
      reviews: {
        ...emptyBundle,
        google: { rating: 4.9, total: 300 },
      },
    });
    expect(schema.aggregateRating).toBeDefined();
    expect(schema.aggregateRating?.reviewCount).toBe(300);
  });

  it("declares opening hours for Tue-Sat and Sun, omitting Monday", () => {
    const schema = buildLocalBusinessSchema();
    const dayUrls = schema.openingHoursSpecification.flatMap((row) => row.dayOfWeek);
    expect(dayUrls).toContain("https://schema.org/Tuesday");
    expect(dayUrls).toContain("https://schema.org/Sunday");
    expect(dayUrls).not.toContain("https://schema.org/Monday");
  });

  it("includes a Menu reference linking to the home page anchor", () => {
    const schema = buildLocalBusinessSchema();
    expect(schema.hasMenu["@type"]).toBe("Menu");
    expect(schema.hasMenu.url).toMatch(/#menu$/);
  });
});

describe("buildWebSiteSchema", () => {
  it("references the business via stable @id", () => {
    const schema = buildWebSiteSchema();
    expect(schema["@type"]).toBe("WebSite");
    expect(schema.publisher["@id"]).toMatch(/#business$/);
  });
});

describe("buildBreadcrumbSchema", () => {
  it("numbers list positions starting at 1", () => {
    const schema = buildBreadcrumbSchema([
      { name: "Home", url: "https://example.com/" },
      { name: "Privacy", url: "https://example.com/privacy" },
    ]);
    expect(schema["@type"]).toBe("BreadcrumbList");
    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[1].position).toBe(2);
  });
});
