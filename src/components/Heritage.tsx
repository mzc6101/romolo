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
        <div className="text-center mb-20 animate-on-scroll">
          <p className="text-[11px] tracking-[0.3em] uppercase text-romolo-red font-medium mb-4">
            Our Heritage
          </p>
          <h2 className="font-[var(--font-serif)] text-4xl md:text-6xl font-light text-romolo-charcoal">
            60 Years of
            <br />
            <span className="italic">Tradition</span>
          </h2>
          <div className="ornament-divider mt-6">
            <span className="text-romolo-red text-lg">&#10045;</span>
          </div>
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
            <h3 className="font-[var(--font-serif)] text-2xl md:text-3xl font-light text-romolo-charcoal mb-6">
              Lorem ipsum dolor sit amet <br className="hidden md:block" />
              consectetur adipiscing elit
            </h3>
            <div className="space-y-5 text-romolo-warm-gray leading-relaxed">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
                ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
                aliquip ex ea commodo consequat.
              </p>
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse
                cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
                cupidatat non proident, sunt in culpa qui officia deserunt mollit
                anim id est laborum.
              </p>
              <p>
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem
                accusantium doloremque laudantium, totam rem aperiam, eaque ipsa
                quae ab illo inventore veritatis et quasi architecto beatae vitae
                dicta sunt explicabo.
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
