export default function Heritage() {
  return (
    <section id="heritage" className="relative py-24 md:py-28 xl:py-36 bg-romolo-cream overflow-hidden">
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
        {/* Section label */}
        <div className="mb-12 md:mb-14 animate-on-scroll">
          <div className="flex items-center gap-6">
            <span aria-hidden className="block h-px w-16 md:w-24 bg-romolo-red/60" />
            <p className="text-base md:text-xl tracking-[0.3em] uppercase text-romolo-red font-medium">
              Our Heritage
            </p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Heritage title and image */}
          <div className="animate-on-scroll space-y-10 md:space-y-12">
            <h2 className="font-[var(--font-serif)] text-5xl md:text-6xl lg:text-7xl font-light text-romolo-charcoal leading-[0.95] tracking-[-0.01em]">
              60 Years of
              <br />
              <span className="italic">Tradition</span>
            </h2>
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
                Romolo &amp; Angela made desserts at home in Vittoria, Sicily.
                When they came to the Bay Area in the 1960s, they bought a
                Swensen&apos;s Ice Cream Parlor, and Romolo&apos;s Cannoli took
                shape as both gelateria and pasticceria, showcasing
                Italian specialties like spumoni, amaretti, and cannoli, alongside
                almond and hazelnut, and eventually ice cream cakes, tiramisu,
                cookies, and our famous cannoli.
              </p>
              <p>
                As bakeries in the Bay Area started closing, Romolo&apos;s
                quickly became the go-to for an authentic Sicilian-Italian
                gelateria and pasticceria. In 2007, Romolo and Angela retired and
                handed their masterpiece to their grandson Joey. The
                creativeness of Joey helped mix tradition with current demands.
              </p>
              <p>
                Sixty years later, the grandkids make everything the same
                way, filled to order from the best ingredients available. Today we
                offer cannoli kits, pistachios, chocolate chips and toffee garnish,
                alternative fillings like lemon, chocolate, pistachio and
                hazelnut, and company catering delivered every day throughout
                the Bay Area in our electric cars.
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
