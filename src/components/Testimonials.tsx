"use client";

import { useMemo, useState } from "react";
import type { ReviewsBundle, LiveReview } from "@/lib/reviews/types";

type Filter = "all" | "google" | "yelp";

type Props = { reviews: ReviewsBundle };

export default function Testimonials({ reviews }: Props) {
  const all = reviews.reviews;
  const [filter, setFilter] = useState<Filter>("all");
  const list = useMemo(
    () => all.filter((r) => filter === "all" || r.source === filter),
    [all, filter]
  );
  const totals = useMemo(() => {
    const g = reviews.google;
    const y = reviews.yelp;
    if (g && y) {
      const total = g.total + y.total;
      const weighted = (g.rating * g.total + y.rating * y.total) / total;
      return { avg: weighted, total };
    }
    if (g) return { avg: g.rating, total: g.total };
    if (y) return { avg: y.rating, total: y.total };
    if (all.length > 0) {
      return {
        avg: all.reduce((a, r) => a + r.rating, 0) / all.length,
        total: all.length,
      };
    }
    return { avg: 0, total: 0 };
  }, [reviews.google, reviews.yelp, all]);
  const isLive = reviews.source === "live";

  return (
    <section
      id="testimonials"
      className="relative py-24 md:py-36 overflow-hidden bg-romolo-cream"
    >
      {/* Translucent storefront B&W backdrop — same treatment as Heritage */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "url('https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1777327598/_N8Z0999-VSCO_baxepo.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "grayscale(1) contrast(1.05) brightness(0.95)",
          opacity: 0.16,
        }}
      />
      {/* Vignette */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(250,248,245,0.55) 30%, rgba(250,248,245,0) 75%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <div className="mb-12 md:mb-16 animate-on-scroll">
          <div className="flex items-center gap-6 mb-8">
            <span aria-hidden className="block h-px w-16 md:w-24 bg-romolo-red/60" />
            <p className="text-base md:text-xl tracking-[0.3em] uppercase text-romolo-red font-medium">
              Reviews
            </p>
          </div>
          <h2 className="font-[var(--font-serif)] text-5xl md:text-6xl lg:text-7xl font-light text-romolo-charcoal leading-[0.95] tracking-[-0.01em]">
            What People <span className="italic">Are Saying</span>
          </h2>
        </div>

        {/* Aggregate row + filter chips */}
        <div className="flex flex-wrap items-center gap-4 mb-9">
          <div className="flex items-center gap-3.5 px-5 py-3.5 bg-white border border-romolo-border rounded-2xl">
            <span className="font-[var(--font-serif)] text-4xl font-semibold leading-none text-romolo-red">
              {totals.avg.toFixed(1)}
            </span>
            <div>
              <div className="inline-flex gap-0.5 text-[#f5b942] text-sm tracking-wider">★★★★★</div>
              <div className="text-[11px] tracking-[0.1em] uppercase text-romolo-warm-gray mt-0.5">
                {totals.total} reviews{isLive ? " · live" : ""}
              </div>
            </div>
          </div>

          <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterChip
            label="Google"
            icon={<SourceLogo s="google" />}
            active={filter === "google"}
            onClick={() => setFilter("google")}
          />
          <FilterChip
            label="Yelp"
            icon={<SourceLogo s="yelp" />}
            active={filter === "yelp"}
            onClick={() => setFilter("yelp")}
          />
        </div>

        {/* Cards */}
        <div
          className="grid gap-4 sm:gap-5"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
        >
          {list.map((r, i) => (
            <ReviewCard key={`${r.author}-${i}`} r={r} delay={(i % 3) + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FilterChip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-[0.04em] border transition-colors ${
        active
          ? "bg-romolo-charcoal text-white border-romolo-charcoal"
          : "bg-white text-romolo-charcoal border-romolo-border hover:border-romolo-charcoal"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ReviewCard({ r, delay }: { r: LiveReview; delay: number }) {
  return (
    <article
      className={`bg-white border border-romolo-border rounded-2xl p-6 relative animate-on-scroll delay-${delay}`}
    >
      <div className="flex items-center gap-3 mb-3.5">
        <div className="w-10 h-10 rounded-full bg-romolo-blue text-romolo-charcoal flex items-center justify-center text-[13px] font-bold tracking-wider">
          {r.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-romolo-charcoal">{r.author}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[#f5b942] text-xs tracking-wider">{"★".repeat(r.rating)}</span>
            <span className="text-[11px] text-romolo-warm-gray">· {r.date}</span>
          </div>
        </div>
        <SourceLogo s={r.source} large />
      </div>
      <p className="font-[var(--font-serif)] text-[17px] leading-relaxed text-romolo-charcoal italic m-0">
        &ldquo;{r.text}&rdquo;
      </p>
    </article>
  );
}

function SourceLogo({ s, large }: { s: "google" | "yelp"; large?: boolean }) {
  const sz = large ? 22 : 14;
  if (s === "google") {
    return (
      <svg
        role="img"
        aria-label="Google"
        width={sz}
        height={sz}
        viewBox="0 0 24 24"
        className="shrink-0"
      >
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09 0-.72.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12c0 1.78.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    );
  }
  return (
    <svg
      role="img"
      aria-label="Yelp"
      width={sz}
      height={sz}
      viewBox="0 0 32 32"
      className="shrink-0"
    >
      <path
        fill="#AF0606"
        d="M14.13 14.4 7.6 12.16c-.74-.27-1.06-1.16-.62-1.78l3.05-4.41c.55-.79 1.79-.62 2.07.28l1.96 6.18c.34 1.07-.85 2.04-1.93 1.97zM14.96 17.42 9.13 21.41c-.66.45-1.57.14-1.79-.62l-1.04-3.55c-.27-.92.59-1.83 1.55-1.65l6.55 1.31c1.13.22 1.62 1.6.56 2.52zM18.41 17.13l3.07 6.05c.35.69-.15 1.51-.93 1.52l-3.7.04c-.96.01-1.66-.91-1.34-1.79l2.16-5.96c.31-.86 1.5-.81 1.74.14zM21.56 15.27l4.9-2.06c.71-.3 1.46.36 1.26 1.1l-.94 3.55c-.24.93-1.4 1.27-2.13.62l-3.43-3.07c-.4-.36-.31-1.01.34-1.14zM21.42 11.55 17.13 5.6c-.5-.7-.13-1.69.71-1.85l3.5-.66c.92-.17 1.78.59 1.66 1.51l-.79 5.99c-.13.99-1.27 1.45-1.79.96z"
      />
    </svg>
  );
}
