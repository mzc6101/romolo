export type ReviewSource = "google";

export type LiveReview = {
  source: ReviewSource;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  text: string;
};

export type ReviewsBundle = {
  reviews: LiveReview[];
  google?: { rating: number; total: number };
  source: "live" | "fallback";
};
