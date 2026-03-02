import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-espresso text-cream/80">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <h3 className="font-serif text-2xl text-cream tracking-wider mb-2">ROMOLO&apos;S</h3>
            <p className="text-[11px] tracking-[0.3em] text-gold uppercase mb-4">Cannoli & Gelato</p>
            <p className="text-sm leading-relaxed text-cream/60">
              Authentic Sicilian flavors, handcrafted with love from recipes passed down for generations.
            </p>
          </div>

          {/* Visit */}
          <div>
            <h4 className="text-sm font-medium uppercase tracking-wider text-cream mb-4">Visit Us</h4>
            <div className="space-y-2 text-sm text-cream/60">
              <p>81 37th Avenue</p>
              <p>San Mateo, CA 94403</p>
              <p className="pt-2">(650) 574-0625</p>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-sm font-medium uppercase tracking-wider text-cream mb-4">Hours</h4>
            <div className="space-y-2 text-sm text-cream/60">
              <div className="flex justify-between">
                <span>Tuesday – Saturday</span>
                <span>11am – 6pm</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday</span>
                <span>12pm – 4pm</span>
              </div>
              <div className="flex justify-between">
                <span>Monday</span>
                <span className="text-terracotta">Closed</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-medium uppercase tracking-wider text-cream mb-4">Quick Links</h4>
            <div className="space-y-2 text-sm">
              <Link href="/menu" className="block text-cream/60 hover:text-gold transition-colors">Menu</Link>
              <Link href="/about" className="block text-cream/60 hover:text-gold transition-colors">Our Story</Link>
              <Link href="/menu" className="block text-cream/60 hover:text-gold transition-colors">Order Online</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-cream/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-cream/40">
            &copy; {new Date().getFullYear()} Romolo&apos;s Cannoli & Spumoni Factory. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-xs text-cream/40">Handcrafted in San Mateo since 1974</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
