import "server-only";
import type { LiveReview } from "./types";
import { initialsFor } from "./format";

type GoogleReview = {
  author_name: string;
  rating: number;
  relative_time_description: string;
  text: string;
};

type PlaceDetailsResponse = {
  status: string;
  error_message?: string;
  result?: {
    rating?: number;
    user_ratings_total?: number;
    reviews?: GoogleReview[];
  };
};

export async function fetchGoogleReviews(): Promise<{
  reviews: LiveReview[];
  rating: number | null;
  total: number | null;
}> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!key || !placeId) {
    throw new Error(
      "Google reviews not configured (GOOGLE_PLACES_API_KEY, GOOGLE_PLACE_ID).",
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "rating,user_ratings_total,reviews");
  url.searchParams.set("reviews_sort", "newest");
  url.searchParams.set("key", key);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Google Places HTTP ${res.status}`);
  }
  const data = (await res.json()) as PlaceDetailsResponse;
  if (data.status !== "OK") {
    throw new Error(
      `Google Places ${data.status}${data.error_message ? `: ${data.error_message}` : ""}`,
    );
  }

  const raw = data.result?.reviews ?? [];
  const reviews: LiveReview[] = raw.map((r) => ({
    source: "google" as const,
    author: r.author_name,
    avatar: initialsFor(r.author_name),
    rating: r.rating,
    date: r.relative_time_description,
    text: r.text,
  }));

  return {
    reviews,
    rating: data.result?.rating ?? null,
    total: data.result?.user_ratings_total ?? null,
  };
}
