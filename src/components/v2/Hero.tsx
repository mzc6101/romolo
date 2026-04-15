import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative h-screen min-h-[700px] overflow-hidden">
      <div className="grid md:grid-cols-2 h-full">
        {/* Left: Text content */}
        <div className="flex items-center justify-center bg-[#f1faee] px-8 md:px-12 lg:px-20 py-24 md:py-0 order-1">
          <div className="max-w-lg">
            {/* Decorative top line */}
            <div className="flex mb-8">
              <div className="w-16 h-[1px] bg-[#2d6a4f]/30" />
            </div>

            <p className="font-[var(--font-sans)] text-[11px] md:text-[13px] tracking-[0.3em] uppercase text-[#2d6a4f] mb-6">
              Authentic Sicilian Treats Since 1968
            </p>

            <h1 className="font-[var(--font-serif)] text-5xl md:text-6xl lg:text-8xl font-light text-[#1a1a1a] leading-[0.9] mb-6">
              Romolo&apos;s
              <br />
              <span className="italic font-light">Cannoli</span>
            </h1>

            <p className="font-[var(--font-serif)] text-lg md:text-xl text-[#5a6b5e] font-light italic max-w-lg mb-10">
              &ldquo;Quote — Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.&rdquo;
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <a
                href="#menu"
                className="px-8 py-3.5 bg-[#2d6a4f] text-white text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-[#1b4332] transition-colors duration-300"
              >
                Explore Our Menu
              </a>
              <a
                href="#heritage"
                className="px-8 py-3.5 border border-[#2d6a4f]/40 text-[#2d6a4f] text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-[#2d6a4f]/10 transition-colors duration-300"
              >
                Our Story
              </a>
            </div>

            {/* Decorative bottom */}
            <div className="flex mt-16">
              <div className="flex flex-col items-center gap-2 text-[#2d6a4f]/40">
                <span className="text-[10px] tracking-[0.2em] uppercase">Scroll</span>
                <div className="w-[1px] h-8 bg-[#2d6a4f]/30 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Image */}
        <div className="relative order-2 min-h-[400px] md:min-h-0">
          <Image
            src="https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1775678635/_N8Z0762_bsvral.jpg"
            alt=""
            fill
            priority
            className="object-cover"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f1faee]/20 to-transparent md:bg-none" />
        </div>
      </div>
    </section>
  );
}
