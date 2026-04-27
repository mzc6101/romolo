"use client";

import { useMemo, useState } from "react";
import { REVIEWS, type Review } from "@/lib/data";

type Filter = "all" | "google" | "yelp";

export default function Testimonials() {
  const [filter, setFilter] = useState<Filter>("all");
  const list = useMemo(
    () => REVIEWS.filter((r) => filter === "all" || r.source === filter),
    [filter]
  );
  const avg = useMemo(
    () => REVIEWS.reduce((a, r) => a + r.rating, 0) / REVIEWS.length,
    []
  );

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
            "url('https://res.cloudinary.com/dhv6sobkv/image/upload/v1775679180/Nonni_cc9rny.avif')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "grayscale(1) contrast(1.05) brightness(0.95)",
          opacity: 0.16,
        }}
      />
      {/* Faux red+white tile motif — placeholder until storefront photo is approved */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.18) 0 22px, transparent 22px 50px)," +
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 22px, transparent 22px 50px)",
          mixBlendMode: "overlay",
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
          <div className="flex items-center gap-3.5 px-5 py-3.5 bg-white border border-romolo-border rounded-sm">
            <span className="font-[var(--font-serif)] text-4xl font-semibold leading-none text-romolo-red">
              {avg.toFixed(1)}
            </span>
            <div>
              <div className="inline-flex gap-0.5 text-[#f5b942] text-sm tracking-wider">★★★★★</div>
              <div className="text-[11px] tracking-[0.1em] uppercase text-romolo-warm-gray mt-0.5">
                {REVIEWS.length * 38} reviews · live
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

function ReviewCard({ r, delay }: { r: Review; delay: number }) {
  return (
    <article
      className={`bg-white border border-romolo-border rounded-sm p-6 relative animate-on-scroll delay-${delay}`}
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
      <span
        title="Google"
        className="inline-flex items-center justify-center rounded-[4px]"
        style={{
          width: sz,
          height: sz,
          background: "#fff",
          border: "1px solid #e0e0e0",
          color: "#4285F4",
          fontWeight: 700,
          fontSize: sz * 0.6,
          letterSpacing: "-0.05em",
        }}
      >
        G
      </span>
    );
  }
  return (
    <span
      title="Yelp"
      className="inline-flex items-center justify-center rounded-[4px] text-white"
      style={{
        width: sz,
        height: sz,
        background: "#d32323",
        fontWeight: 700,
        fontSize: sz * 0.55,
      }}
    >
      Y
    </span>
  );
}
