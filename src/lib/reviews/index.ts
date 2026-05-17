import "server-only";
import { unstable_cache } from "next/cache";
import { REVIEWS as STATIC_FALLBACK } from "@/lib/data";
import type { ReviewsBundle } from "./types";
import { fetchGoogleReviews } from "./google";

const CACHE_SECONDS = 86400;

const cachedBundle = unstable_cache(
  async (): Promise<ReviewsBundle | null> => {
    const g = await fetchGoogleReviews();
    return {
      reviews: g.reviews,
      google:
        g.rating !== null && g.total !== null
          ? { rating: g.rating, total: g.total }
          : undefined,
      source: "live",
    };
  },
  ["reviews-live", "v2"],
  { revalidate: CACHE_SECONDS },
);

const FALLBACK: ReviewsBundle = {
  reviews: STATIC_FALLBACK.map((r) => ({
    source: r.source,
    author: r.author,
    avatar: r.avatar,
    rating: r.rating,
    date: r.date,
    text: r.text,
  })),
  source: "fallback",
};

export async function getReviews(): Promise<ReviewsBundle> {
  try {
    const live = await cachedBundle();
    if (live && live.reviews.length > 0) return live;
    if (process.env.NODE_ENV !== "production") {
      console.warn("Live reviews returned empty; using static fallback.");
    }
    return FALLBACK;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Reviews fetch failed; using static fallback.", err);
    }
    return FALLBACK;
  }
}

export type { ReviewsBundle, LiveReview } from "./types";
