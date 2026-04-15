export default function Heritage() {
  return (
    <section id="heritage" className="py-24 md:py-36 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <div className="text-center mb-20 animate-on-scroll">
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#d4a574] font-medium mb-4">
            Our Heritage
          </p>
          <h2 className="font-[var(--font-serif)] text-4xl md:text-6xl font-light text-[#1a1a1a]">
            60 Years of
            <br />
            <span className="italic">Tradition</span>
          </h2>
          <div className="ornament-divider mt-6" style={{ borderColor: "#d4a574" }}>
            <span className="text-[#d4a574] text-lg">&#10045;</span>
          </div>
        </div>

        {/* Two-column layout - REVERSED: text left, image right */}
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Story content - LEFT (order-2 on mobile, order-1 on md+) */}
          <div className="animate-on-scroll order-2 md:order-1">
            <span className="font-[var(--font-serif)] text-8xl md:text-9xl font-light text-[#d4a574] leading-none block mb-2">
              1968
            </span>
            <h3 className="font-[var(--font-serif)] text-2xl md:text-3xl font-light text-[#1a1a1a] mb-6">
              Lorem ipsum dolor sit amet <br className="hidden md:block" />
              consectetur adipiscing elit
            </h3>
            <div className="space-y-5 text-[#8a7e75] leading-relaxed">
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
                <span className="font-[var(--font-serif)] text-4xl font-semibold text-[#d4a574] block">
                  60+
                </span>
                <span className="text-[11px] tracking-[0.15em] uppercase text-[#8a7e75]">
                  Years
                </span>
              </div>
              <div className="w-[1px] h-12 bg-[#e0d8d0]" />
              <div className="text-center">
                <span className="font-[var(--font-serif)] text-4xl font-semibold text-[#d4a574] block">
                  3
                </span>
                <span className="text-[11px] tracking-[0.15em] uppercase text-[#8a7e75]">
                  Generations
                </span>
              </div>
              <div className="w-[1px] h-12 bg-[#e0d8d0]" />
              <div className="text-center">
                <span className="font-[var(--font-serif)] text-4xl font-semibold text-[#d4a574] block">
                  1
                </span>
                <span className="text-[11px] tracking-[0.15em] uppercase text-[#8a7e75]">
                  Recipe
                </span>
              </div>
            </div>
          </div>

          {/* Heritage image - RIGHT (order-1 on mobile, order-2 on md+) */}
          <div className="animate-on-scroll delay-2 order-1 md:order-2">
            <img
              src="https://res.cloudinary.com/dhv6sobkv/image/upload/v1775679180/Nonni_cc9rny.avif"
              alt="Nonno Romolo in his original Sicilian pastry shop, circa 1965"
              className="block rounded-sm border-2 border-[#d4a574]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
