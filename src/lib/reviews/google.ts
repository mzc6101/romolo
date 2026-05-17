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

type SortMode = "newest" | "most_relevant";

async function fetchSorted(
  key: string,
  placeId: string,
  sort: SortMode,
): Promise<PlaceDetailsResponse> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "rating,user_ratings_total,reviews");
  url.searchParams.set("reviews_sort", sort);
  url.searchParams.set("key", key);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Google Places HTTP ${res.status}`);
  const data = (await res.json()) as PlaceDetailsResponse;
  if (data.status !== "OK") {
    throw new Error(
      `Google Places ${data.status}${data.error_message ? `: ${data.error_message}` : ""}`,
    );
  }
  return data;
}

function toLiveReviews(raw: GoogleReview[]): LiveReview[] {
  return raw
    .filter((r) => r.text && r.text.trim().length > 0)
    .map((r) => ({
      source: "google" as const,
      author: r.author_name,
      avatar: initialsFor(r.author_name),
      rating: r.rating,
      date: r.relative_time_description,
      text: r.text,
    }));
}

function dedupeKey(r: LiveReview): string {
  return `${r.author}::${r.text.slice(0, 60)}`;
}

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

  const [newestRes, relevantRes] = await Promise.allSettled([
    fetchSorted(key, placeId, "newest"),
    fetchSorted(key, placeId, "most_relevant"),
  ]);

  if (newestRes.status === "rejected" && relevantRes.status === "rejected") {
    throw newestRes.reason;
  }

  const newest =
    newestRes.status === "fulfilled" ? toLiveReviews(newestRes.value.result?.reviews ?? []) : [];
  const relevant =
    relevantRes.status === "fulfilled"
      ? toLiveReviews(relevantRes.value.result?.reviews ?? [])
      : [];

  const merged: LiveReview[] = [];
  const seen = new Set<string>();
  for (const r of [...newest, ...relevant]) {
    const k = dedupeKey(r);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(r);
  }

  const meta = newestRes.status === "fulfilled" ? newestRes.value : (relevantRes as PromiseFulfilledResult<PlaceDetailsResponse>).value;

  return {
    reviews: merged,
    rating: meta.result?.rating ?? null,
    total: meta.result?.user_ratings_total ?? null,
  };
}
