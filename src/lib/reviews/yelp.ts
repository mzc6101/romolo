import "server-only";
import type { LiveReview } from "./types";
import { initialsFor, relativeTime } from "./format";

type YelpReview = {
  user: { name: string };
  rating: number;
  text: string;
  time_created: string;
};

type YelpReviewsResponse = {
  reviews?: YelpReview[];
  total?: number;
};

type YelpBusinessResponse = {
  rating?: number;
  review_count?: number;
};

export async function fetchYelpReviews(): Promise<{
  reviews: LiveReview[];
  rating: number | null;
  total: number | null;
}> {
  const key = process.env.YELP_API_KEY;
  const businessId = process.env.YELP_BUSINESS_ID;
  if (!key || !businessId) {
    throw new Error(
      "Yelp reviews not configured (YELP_API_KEY, YELP_BUSINESS_ID).",
    );
  }
  const headers = {
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  } as const;

  const id = encodeURIComponent(businessId);

  const [reviewsRes, businessRes] = await Promise.all([
    fetch(`https://api.yelp.com/v3/businesses/${id}/reviews?limit=3&sort_by=yelp_sort`, {
      headers,
      cache: "no-store",
    }),
    fetch(`https://api.yelp.com/v3/businesses/${id}`, {
      headers,
      cache: "no-store",
    }),
  ]);

  if (!reviewsRes.ok) throw new Error(`Yelp reviews HTTP ${reviewsRes.status}`);
  const reviewsData = (await reviewsRes.json()) as YelpReviewsResponse;

  let rating: number | null = null;
  let total: number | null = null;
  if (businessRes.ok) {
    const biz = (await businessRes.json()) as YelpBusinessResponse;
    rating = biz.rating ?? null;
    total = biz.review_count ?? null;
  }

  const raw = reviewsData.reviews ?? [];
  const reviews: LiveReview[] = raw.map((r) => ({
    source: "yelp" as const,
    author: r.user.name,
    avatar: initialsFor(r.user.name),
    rating: r.rating,
    date: relativeTime(r.time_created),
    text: r.text,
  }));

  return { reviews, rating, total };
}
