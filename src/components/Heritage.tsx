export default function Heritage() {
  return (
    <section id="heritage" className="py-24 md:py-36 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
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
          {/* Image placeholder */}
          <div className="animate-on-scroll">
            <div className="aspect-[4/5] bg-romolo-cream rounded-sm flex items-center justify-center border border-romolo-border">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-romolo-border flex items-center justify-center">
                  <span className="text-romolo-warm-gray text-2xl">&#128247;</span>
                </div>
                <p className="text-romolo-warm-gray text-sm tracking-wide">
                  [ Heritage Photo — Nonno Romolo in his original Sicilian pastry shop, circa 1965 ]
                </p>
              </div>
            </div>
          </div>

          {/* Story content */}
          <div className="animate-on-scroll delay-2">
            <span className="font-[var(--font-serif)] text-8xl md:text-9xl font-light text-romolo-blue leading-none block mb-2">
              1965
            </span>
            <h3 className="font-[var(--font-serif)] text-2xl md:text-3xl font-light text-romolo-charcoal mb-6">
              From a small kitchen in Palermo <br className="hidden md:block" />
              to your table
            </h3>
            <div className="space-y-5 text-romolo-warm-gray leading-relaxed">
              <p>
                In 1965, Romolo Ferrara opened a tiny pastry shop on a cobblestone
                street in Palermo, Sicily. Armed with nothing but his
                grandmother&apos;s recipe and an unwavering belief that the best
                cannoli should shatter at first bite, he began a tradition that
                would span three generations.
              </p>
              <p>
                His secret was simple: the finest fresh ricotta, hand-rolled shells
                fried to golden perfection, and a filling so creamy it would make
                the angels weep. Word spread from neighbor to neighbor, street to
                street, until &ldquo;Romolo&apos;s&rdquo; became synonymous with
                the very best cannoli in all of Sicily.
              </p>
              <p>
                Today, the Ferrara family continues Nonno Romolo&apos;s legacy —
                using the same time-honored techniques, the same devotion to
                quality, and the same love that started it all over sixty years ago.
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
