import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="py-20 px-6 bg-cream-dark border-b border-border">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm tracking-[0.3em] text-gold uppercase mb-3">Since 1974</p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-espresso mb-6">Our Story</h1>
          <p className="text-lg text-brown max-w-2xl mx-auto leading-relaxed">
            A Sicilian family tradition that has been delighting the Bay Area for over 50 years.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Image placeholder with elegant gradient */}
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border border-border order-2 lg:order-1">
              <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gold/8" />
              <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-terracotta/8" />
              <div className="absolute top-12 left-12 w-20 h-20 rounded-full bg-gold/10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-28 h-28 mx-auto rounded-full bg-white/60 flex items-center justify-center mb-4 shadow-sm">
                    <svg className="w-14 h-14 text-gold/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <p className="text-sm text-brown/40 italic font-serif">Romolo & Angela</p>
                  <p className="text-xs text-muted/60 tracking-wider uppercase mt-1">Founders, 1974</p>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="font-serif text-3xl sm:text-4xl text-espresso mb-6 leading-tight">
                From a Small Ice Cream Parlor to a <span className="text-gold italic">Sicilian Institution</span>
              </h2>
              <div className="space-y-4 text-brown leading-relaxed">
                <p>
                  Over 50 years ago, Romolo and Angela saw an opportunity — a Swensen&apos;s Ice Cream
                  Parlor for sale in San Mateo. With nothing but a dream and the recipes passed down
                  from Romolo&apos;s Sicilian grandmother, they transformed it into something the
                  Bay Area had never seen.
                </p>
                <p>
                  Romolo&apos;s Cannoli was born as a true Sicilian experience — part gelateria, part
                  pasticceria, and wholly dedicated to authentic flavors. From day one, every cannoli
                  has been filled to order, ensuring that perfect balance between a crisp, golden
                  shell and our signature ricotta cream.
                </p>
                <p>
                  Today, Romolo&apos;s remains a family affair. The same dedication to quality, the same
                  recipes, and the same love that Romolo and Angela poured into every creation continues
                  to define who we are.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-6 bg-cream-dark">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm tracking-[0.3em] text-gold uppercase mb-3">What We Believe</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-espresso">Made with Heart</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card rounded-2xl p-8 border border-border">
              <div className="w-14 h-14 mb-6 rounded-full bg-cream-dark flex items-center justify-center">
                <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-serif text-xl text-espresso mb-3">Filled to Order</h3>
              <p className="text-muted leading-relaxed">
                Every single cannoli is filled the moment you order it. We never pre-fill — because
                a crisp shell makes all the difference.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-8 border border-border">
              <div className="w-14 h-14 mb-6 rounded-full bg-cream-dark flex items-center justify-center">
                <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <h3 className="font-serif text-xl text-espresso mb-3">Family Recipes</h3>
              <p className="text-muted leading-relaxed">
                Our recipes have been passed down through generations of Romolo&apos;s Sicilian family.
                Authentic flavors you can taste in every bite.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-8 border border-border">
              <div className="w-14 h-14 mb-6 rounded-full bg-cream-dark flex items-center justify-center">
                <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <h3 className="font-serif text-xl text-espresso mb-3">Premium Ingredients</h3>
              <p className="text-muted leading-relaxed">
                From our imported ricotta to our handmade shells, we source only the finest ingredients
                for our Sicilian treats.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm tracking-[0.3em] text-gold uppercase mb-3">Milestones</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-espresso">Our Journey</h2>
          </div>

          <div className="space-y-12">
            {[
              { year: "1974", title: "The Beginning", desc: "Romolo and Angela purchase a Swensen's Ice Cream Parlor in San Mateo and begin transforming it into a Sicilian gelateria." },
              { year: "1980s", title: "Cannoli Arrives", desc: "The signature cannoli, made from Nonna's recipe, becomes the shop's most beloved item. Customers line up daily." },
              { year: "2000s", title: "A Local Legend", desc: "Word spreads across the Bay Area. Romolo's becomes the go-to destination for authentic Sicilian desserts." },
              { year: "Today", title: "50+ Years Strong", desc: "Still family-owned, still filling to order, still using the same recipes. Some things are worth preserving." },
            ].map((milestone) => (
              <div key={milestone.year} className="flex gap-8">
                <div className="flex-shrink-0 w-20">
                  <span className="font-serif text-lg text-gold">{milestone.year}</span>
                </div>
                <div className="pb-12 border-l border-border pl-8 relative">
                  <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-gold" />
                  <h3 className="font-serif text-xl text-espresso mb-2">{milestone.title}</h3>
                  <p className="text-muted leading-relaxed">{milestone.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-espresso py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl sm:text-4xl text-cream mb-4">
            Come Taste the Tradition
          </h2>
          <p className="text-cream/60 mb-8 max-w-lg mx-auto">
            Visit us at 81 37th Avenue in San Mateo, or order online for pickup.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/menu"
              className="inline-flex items-center px-8 py-4 text-sm tracking-widest text-espresso bg-gold rounded-full hover:bg-gold-dark transition-colors uppercase font-medium"
            >
              Order Now
            </Link>
            <a
              href="https://maps.google.com/?q=81+37th+Ave+San+Mateo+CA+94403"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 text-sm tracking-widest text-cream border border-cream/30 rounded-full hover:border-cream hover:text-cream transition-colors uppercase font-medium"
            >
              Get Directions
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
