export default function Heritage() {
  return (
    <section id="heritage" className="relative py-24 md:py-36 bg-romolo-cream overflow-hidden">
      {/* Aged B&W photographic backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "url('https://res.cloudinary.com/dhv6sobkv/image/upload/v1775679180/Nonni_cc9rny.avif')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "grayscale(1) contrast(1.1) brightness(0.95)",
          opacity: 0.15,
        }}
      />
      {/* Vignette for depth */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(250,248,245,0) 40%, rgba(26,26,26,0.22) 100%)",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <div className="mb-16 md:mb-24 animate-on-scroll">
          <div className="flex items-center gap-6 mb-8">
            <span aria-hidden className="block h-px w-16 md:w-24 bg-romolo-red/60" />
            <p className="text-base md:text-xl tracking-[0.3em] uppercase text-romolo-red font-medium">
              Our Heritage
            </p>
          </div>
          <h2 className="font-[var(--font-serif)] text-5xl md:text-6xl lg:text-7xl font-light text-romolo-charcoal leading-[0.95] tracking-[-0.01em]">
            60 Years of
            <br />
            <span className="italic">Tradition</span>
          </h2>
        </div>

        {/* Two-column layout */}
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Heritage image */}
          <div className="animate-on-scroll">
            <img
              src="https://res.cloudinary.com/dhv6sobkv/image/upload/v1775679180/Nonni_cc9rny.avif"
              alt="Nonno Romolo in his original Sicilian pastry shop, circa 1965"
              className="block rounded-sm border-2 border-romolo-blue"
            />
          </div>

          {/* Story content */}
          <div className="animate-on-scroll delay-2">
            <span className="font-[var(--font-serif)] text-8xl md:text-9xl font-light text-romolo-blue leading-none block mb-2">
              1968
            </span>
            <h3 className="font-[var(--font-serif)] text-2xl md:text-3xl font-light text-romolo-charcoal mb-6 leading-snug">
              From a Sicilian village kitchen
              <br className="hidden md:block" />
              to a corner shop in San Mateo.
            </h3>
            <div className="space-y-5 text-romolo-warm-gray leading-relaxed">
              <p>
                Romolo learned to fold ricotta from his mother in a stone kitchen
                outside Palermo. When he came west in &apos;68, he brought one
                handwritten recipe and a metal cannolo tube wrapped in cloth.
              </p>
              <p>
                Sixty years later, his grandkids still fry every shell to order
                on the same flat-top in the back. Aaron pipes ricotta the way
                Romolo taught him — from a fold in a square of parchment, never
                from a bag.
              </p>
              <p>
                We don&apos;t make cannoli ahead. We don&apos;t make them in
                batches. We make them when you order them, and we make them the
                same way we always have.
              </p>
            </div>

            <div className="mt-10 flex items-center gap-6">
              <div className="text-center">
                <span className="font-[var(--font-serif)] text-4xl font-semibold text-romolo-red block">
                  60+
                </span>
                <span className="text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray">
                  Years
                </span>
              </div>
              <div className="w-[1px] h-12 bg-romolo-border" />
              <div className="text-center">
                <span className="font-[var(--font-serif)] text-4xl font-semibold text-romolo-red block">
                  3
                </span>
                <span className="text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray">
                  Generations
                </span>
              </div>
              <div className="w-[1px] h-12 bg-romolo-border" />
              <div className="text-center">
                <span className="font-[var(--font-serif)] text-4xl font-semibold text-romolo-red block">
                  1
                </span>
                <span className="text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray">
                  Recipe
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
