import "server-only";
import { unstable_cache } from "next/cache";
import { REVIEWS as STATIC_FALLBACK } from "@/lib/data";
import type { LiveReview, ReviewsBundle } from "./types";
import { fetchGoogleReviews } from "./google";
import { fetchYelpReviews } from "./yelp";

const CACHE_SECONDS = 900;

const cachedBundle = unstable_cache(
  async (): Promise<ReviewsBundle | null> => {
    const [g, y] = await Promise.allSettled([
      fetchGoogleReviews(),
      fetchYelpReviews(),
    ]);

    const gOk = g.status === "fulfilled";
    const yOk = y.status === "fulfilled";

    if (!gOk && !yOk) return null;

    const reviews: LiveReview[] = [
      ...(gOk ? g.value.reviews : []),
      ...(yOk ? y.value.reviews : []),
    ];

    return {
      reviews,
      google:
        gOk && g.value.rating !== null && g.value.total !== null
          ? { rating: g.value.rating, total: g.value.total }
          : undefined,
      yelp:
        yOk && y.value.rating !== null && y.value.total !== null
          ? { rating: y.value.rating, total: y.value.total }
          : undefined,
      source: "live",
    };
  },
  ["reviews-live"],
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
