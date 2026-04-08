export default function Hero() {
  return (
    <section className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* Background placeholder */}
      <div className="absolute inset-0 bg-romolo-charcoal">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
        {/* Placeholder for hero image — replace this div with an <Image> later */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white/20 text-sm tracking-widest uppercase">
            [ Hero Background Image — Cannoli Workshop / Italian Street Scene ]
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Decorative top line */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-[1px] bg-white/40" />
        </div>

        <p className="font-[var(--font-sans)] text-[11px] md:text-[13px] tracking-[0.3em] uppercase text-white/70 mb-6">
          Authentic Sicilian Cannoli Since 1965
        </p>

        <h1 className="font-[var(--font-serif)] text-6xl md:text-8xl lg:text-9xl font-light text-white leading-[0.9] mb-6">
          Romolo&apos;s
          <br />
          <span className="italic font-light">Cannoli</span>
        </h1>

        <p className="font-[var(--font-serif)] text-lg md:text-xl text-white/80 font-light italic max-w-lg mx-auto mb-10">
          &ldquo;Every shell cracked, every filling piped — by hand, with love,
          as Nonno Romolo taught us.&rdquo;
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#menu"
            className="px-8 py-3.5 bg-romolo-red text-white text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-romolo-red-dark transition-colors duration-300"
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
        <div className="flex justify-center mt-16">
          <div className="flex flex-col items-center gap-2 text-white/40">
            <span className="text-[10px] tracking-[0.2em] uppercase">Scroll</span>
            <div className="w-[1px] h-8 bg-white/30 animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
}
