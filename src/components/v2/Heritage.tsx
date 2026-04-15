export default function Heritage() {
  return (
    <section id="heritage" className="py-24 md:py-36 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <div className="text-center mb-20 animate-on-scroll">
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#2d6a4f] font-medium mb-4">
            Our Heritage
          </p>
          <h2 className="font-[var(--font-serif)] text-4xl md:text-6xl font-light text-[#1a1a1a]">
            60 Years of
            <br />
            <span className="italic">Tradition</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="h-[1px] w-12 bg-[#2d6a4f]/30" />
            <span className="text-[#2d6a4f] text-lg">&#10045;</span>
            <div className="h-[1px] w-12 bg-[#2d6a4f]/30" />
          </div>
        </div>

        {/* Stacked layout: full-width image above text */}
        <div className="animate-on-scroll">
          <div className="w-full mb-12 lg:mb-16">
            <img
              src="https://res.cloudinary.com/dhv6sobkv/image/upload/v1775679180/Nonni_cc9rny.avif"
              alt="Nonno Romolo in his original Sicilian pastry shop, circa 1965"
              className="block w-full rounded-sm border-2 border-[#95d5b2] max-h-[500px] object-cover"
            />
          </div>

          {/* Story content - centered below */}
          <div className="max-w-3xl mx-auto text-center animate-on-scroll delay-2">
            <span className="font-[var(--font-serif)] text-8xl md:text-9xl font-light text-[#95d5b2] leading-none block mb-2">
              1968
            </span>
            <h3 className="font-[var(--font-serif)] text-2xl md:text-3xl font-light text-[#1a1a1a] mb-6">
              Lorem ipsum dolor sit amet <br className="hidden md:block" />
              consectetur adipiscing elit
            </h3>
            <div className="space-y-5 text-[#5a6b5e] leading-relaxed text-left md:text-center">
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

            <div className="mt-10 flex items-center justify-center gap-6">
              <div className="text-center">
                <span className="font-[var(--font-serif)] text-4xl font-semibold text-[#2d6a4f] block">
                  60+
                </span>
                <span className="text-[11px] tracking-[0.15em] uppercase text-[#5a6b5e]">
                  Years
                </span>
              </div>
              <div className="w-[1px] h-12 bg-[#c9d5c7]" />
              <div className="text-center">
                <span className="font-[var(--font-serif)] text-4xl font-semibold text-[#2d6a4f] block">
                  3
                </span>
                <span className="text-[11px] tracking-[0.15em] uppercase text-[#5a6b5e]">
                  Generations
                </span>
              </div>
              <div className="w-[1px] h-12 bg-[#c9d5c7]" />
              <div className="text-center">
                <span className="font-[var(--font-serif)] text-4xl font-semibold text-[#2d6a4f] block">
                  1
                </span>
                <span className="text-[11px] tracking-[0.15em] uppercase text-[#5a6b5e]">
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
