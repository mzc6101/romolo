import Link from "next/link";
import { menuItems } from "@/lib/menu-data";
import { FeaturedSection } from "@/components/FeaturedSection";

const featured = menuItems.filter((i) => i.badge === "Bestseller" || i.badge === "Signature");

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-cream-dark">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #2C1810 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }} />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-sm tracking-[0.4em] text-gold uppercase mb-6 animate-fade-in">
            Est. 1974 &middot; San Mateo, California
          </p>
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-8xl text-espresso leading-[1.1] mb-6">
            Handcrafted
            <br />
            <span className="text-gold italic">Sicilian</span>
            <br />
            Cannoli
          </h1>
          <p className="text-lg sm:text-xl text-brown max-w-xl mx-auto leading-relaxed mb-10">
            Filled to order with our family recipe passed down for generations.
            Every cannoli has the perfect balance of a crisp shell and delicious ricotta cream.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/menu"
              className="inline-flex items-center px-8 py-4 text-sm tracking-widest text-cream bg-espresso rounded-full hover:bg-brown transition-all duration-300 uppercase font-medium hover:shadow-xl hover:shadow-espresso/20"
            >
              Explore Our Menu
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center px-8 py-4 text-sm tracking-widest text-espresso border border-espresso/30 rounded-full hover:border-gold hover:text-gold transition-colors uppercase font-medium"
            >
              Our Story
            </Link>
          </div>
        </div>

        {/* Decorative scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted">
          <span className="text-[10px] tracking-widest uppercase">Scroll</span>
          <div className="w-px h-8 bg-border" />
        </div>
      </section>

      {/* Tagline strip */}
      <section className="bg-espresso py-5 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="text-sm tracking-[0.3em] text-cream/50 uppercase mx-8">
              Cannoli &middot; Gelato &middot; Spumoni &middot; Tiramisu &middot; Amaretti
            </span>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm tracking-[0.3em] text-gold uppercase mb-3">Favorites</p>
            <h2 className="font-serif text-4xl sm:text-5xl text-espresso mb-4">Our Signatures</h2>
            <p className="text-muted max-w-lg mx-auto">
              Every item is made with care using authentic Sicilian recipes and the finest ingredients.
            </p>
          </div>
          <FeaturedSection items={featured} />
          <div className="text-center mt-12">
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-sm tracking-widest text-espresso border border-espresso rounded-full hover:bg-espresso hover:text-cream transition-all duration-300 uppercase font-medium"
            >
              View Full Menu
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="py-24 px-6 bg-cream-dark">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Image placeholder with styled gradient */}
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-gradient-to-br from-amber-100 via-orange-50 to-rose-50 border border-border">
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gold/10" />
              <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-terracotta/10" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-white/50 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto text-gold/50 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                  </svg>
                  <p className="text-xs tracking-widest text-brown/50 uppercase">Est. 1974</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm tracking-[0.3em] text-gold uppercase mb-3">Our Story</p>
              <h2 className="font-serif text-4xl sm:text-5xl text-espresso mb-6 leading-tight">
                A Family Tradition <br />
                <span className="text-gold italic">Since 1974</span>
              </h2>
              <p className="text-brown leading-relaxed mb-4">
                Over 50 years ago, Romolo and Angela transformed a humble Swensen&apos;s Ice Cream Parlor
                into something extraordinary — a true Sicilian gelateria and pasticceria right in the
                heart of San Mateo.
              </p>
              <p className="text-brown leading-relaxed mb-8">
                Today, every cannoli is still filled to order using the same recipe passed down through
                generations. We believe that the perfect cannoli starts with a crisp shell and ends with
                the most delicious ricotta cream you&apos;ve ever tasted.
              </p>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-sm tracking-widest text-espresso uppercase font-medium group"
              >
                Read More
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Visit section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm tracking-[0.3em] text-gold uppercase mb-3">Visit</p>
          <h2 className="font-serif text-4xl sm:text-5xl text-espresso mb-12">Come Say Hello</h2>

          <div className="grid sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="p-8 rounded-2xl bg-card border border-border">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-cream-dark flex items-center justify-center">
                <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <h3 className="font-serif text-lg text-espresso mb-2">Location</h3>
              <p className="text-sm text-muted">81 37th Avenue<br />San Mateo, CA 94403</p>
            </div>

            <div className="p-8 rounded-2xl bg-card border border-border">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-cream-dark flex items-center justify-center">
                <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-serif text-lg text-espresso mb-2">Hours</h3>
              <p className="text-sm text-muted">Tue–Sat: 11am–6pm<br />Sun: 12pm–4pm</p>
            </div>

            <div className="p-8 rounded-2xl bg-card border border-border">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-cream-dark flex items-center justify-center">
                <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </div>
              <h3 className="font-serif text-lg text-espresso mb-2">Contact</h3>
              <p className="text-sm text-muted">(650) 574-0625</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-espresso py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl sm:text-4xl text-cream mb-4">
            Ready to taste tradition?
          </h2>
          <p className="text-cream/60 mb-8 max-w-lg mx-auto">
            Order online for pickup or visit us at our San Mateo shop. Every cannoli is filled fresh, just for you.
          </p>
          <Link
            href="/menu"
            className="inline-flex items-center px-8 py-4 text-sm tracking-widest text-espresso bg-gold rounded-full hover:bg-gold-dark transition-colors uppercase font-medium"
          >
            Order Now
          </Link>
        </div>
      </section>
    </>
  );
}
