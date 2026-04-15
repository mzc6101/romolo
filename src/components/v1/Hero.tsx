import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative h-screen min-h-[700px] flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-[#1a1a1a]">
        <Image
          src="https://res.cloudinary.com/dhv6sobkv/image/upload/q_auto/f_auto/v1775678635/_N8Z0762_bsvral.jpg"
          alt=""
          fill
          priority
          className="object-cover"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
      </div>

      {/* Content - LEFT aligned */}
      <div className="relative z-10 text-left px-6 max-w-4xl mx-auto w-full">
        {/* Left-aligned gold decorative line */}
        <div className="mb-8">
          <div className="w-16 h-[1px] bg-[#d4a574]" />
        </div>

        <p className="font-[var(--font-sans)] text-[11px] md:text-[13px] tracking-[0.3em] uppercase text-white/70 mb-6">
          Authentic Sicilian Treats Since 1968
        </p>

        <h1 className="font-[var(--font-serif)] text-6xl md:text-8xl lg:text-9xl font-light text-white leading-[0.9] mb-6">
          Romolo&apos;s
          <br />
          <span className="italic font-light">Cannoli</span>
        </h1>

        <p className="font-[var(--font-serif)] text-lg md:text-xl text-white/80 font-light italic max-w-lg mb-10">
          &ldquo;Quote — Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.&rdquo;
        </p>

        <div className="flex flex-col sm:flex-row items-start gap-4">
          <a
            href="#menu"
            className="px-8 py-3.5 bg-[#d4a574] text-white text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-[#b8915f] transition-colors duration-300"
          >
            Explore Our Menu
          </a>
          <a
            href="#heritage"
            className="px-8 py-3.5 border border-white/40 text-white text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-white/10 transition-colors duration-300"
          >
            Our Story
          </a>
        </div>

        {/* Decorative bottom */}
        <div className="flex mt-16">
          <div className="flex flex-col items-start gap-2 text-white/40">
            <span className="text-[10px] tracking-[0.2em] uppercase">Scroll</span>
            <div className="w-[1px] h-8 bg-white/30 animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
}
