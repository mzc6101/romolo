import Link from "next/link";

export default function AlternativeDesigns() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <p className="text-[11px] tracking-[0.3em] uppercase text-romolo-red font-medium mb-4">
          Design Exploration
        </p>
        <h1 className="font-[var(--font-serif)] text-4xl md:text-6xl font-light text-romolo-charcoal mb-4">
          Alternative <span className="italic">Designs</span>
        </h1>
        <p className="text-romolo-warm-gray leading-relaxed mb-16 max-w-xl">
          The current design and two alternate visual directions for the
          Romolo&apos;s Cannoli website. Same content, different colors and layouts.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Current Design Card */}
          <Link
            href="/"
            className="group block border border-romolo-border rounded-sm p-8 hover:shadow-lg transition-all duration-300"
          >
            <div className="w-full h-40 bg-gradient-to-br from-romolo-cream to-romolo-blue rounded-sm mb-6 flex items-center justify-center">
              <span className="font-[var(--font-serif)] text-3xl font-light text-romolo-red">
                Classic Red
              </span>
            </div>
            <h2 className="font-[var(--font-serif)] text-2xl font-light text-romolo-charcoal mb-2 group-hover:text-romolo-red transition-colors">
              Current Design
            </h2>
            <p className="text-sm text-romolo-warm-gray leading-relaxed">
              The original design with red accents, soft blue sections, centered
              hero, and the classic Romolo&apos;s aesthetic.
            </p>
          </Link>

          {/* V1 Card */}
          <Link
            href="/alternativedesigns/v1"
            className="group block border border-romolo-border rounded-sm p-8 hover:shadow-lg transition-all duration-300"
          >
            <div className="w-full h-40 bg-gradient-to-br from-[#2a2520] to-[#1a1510] rounded-sm mb-6 flex items-center justify-center">
              <span className="font-[var(--font-serif)] text-3xl font-light text-[#d4a574]">
                Dark &amp; Gold
              </span>
            </div>
            <h2 className="font-[var(--font-serif)] text-2xl font-light text-romolo-charcoal mb-2 group-hover:text-[#d4a574] transition-colors">
              Variation 1
            </h2>
            <p className="text-sm text-romolo-warm-gray leading-relaxed">
              Warm dark backgrounds with gold accents. Reversed column layouts,
              2-column process grid, and a moody bistro aesthetic.
            </p>
          </Link>

          {/* V2 Card */}
          <Link
            href="/alternativedesigns/v2"
            className="group block border border-romolo-border rounded-sm p-8 hover:shadow-lg transition-all duration-300"
          >
            <div className="w-full h-40 bg-gradient-to-br from-[#d8e2dc] to-[#a7c4a0] rounded-sm mb-6 flex items-center justify-center">
              <span className="font-[var(--font-serif)] text-3xl font-light text-[#2d6a4f]">
                Fresh &amp; Green
              </span>
            </div>
            <h2 className="font-[var(--font-serif)] text-2xl font-light text-romolo-charcoal mb-2 group-hover:text-[#2d6a4f] transition-colors">
              Variation 2
            </h2>
            <p className="text-sm text-romolo-warm-gray leading-relaxed">
              Forest green accents on clean white. Full-width stacked heritage
              section, horizontal process timeline, and a fresh garden feel.
            </p>
          </Link>
        </div>

        <div className="mt-12">
          <Link
            href="/"
            className="text-sm text-romolo-warm-gray hover:text-romolo-red transition-colors"
          >
            &larr; Back to main site
          </Link>
        </div>
      </div>
    </div>
  );
}
