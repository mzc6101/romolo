const testimonials = [
  {
    quote:
      "The best cannoli I've ever had outside of Sicily. That shell — my God — it shatters like a dream. Romolo's is the real deal.",
    author: "Maria C.",
    role: "Food Critic, The Local Gazette",
  },
  {
    quote:
      "We've been ordering the Cannoli Box for every family gathering for the past fifteen years. It wouldn't be a celebration without Romolo's.",
    author: "The Bianchi Family",
    role: "Loyal Customers Since 2009",
  },
  {
    quote:
      "I brought my Nonna here and she cried. She said it tasted exactly like home. That's the highest compliment you can get.",
    author: "Giuseppe T.",
    role: "Regular Customer",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-24 md:py-36 bg-romolo-cream">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <div className="text-center mb-16 animate-on-scroll">
          <p className="text-[11px] tracking-[0.3em] uppercase text-romolo-red font-medium mb-4">
            Kind Words
          </p>
          <h2 className="font-[var(--font-serif)] text-4xl md:text-6xl font-light text-romolo-charcoal">
            What People <span className="italic">Say</span>
          </h2>
          <div className="ornament-divider mt-6">
            <span className="text-romolo-red text-lg">&#10045;</span>
          </div>
        </div>

        {/* Testimonial cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className={`animate-on-scroll delay-${i + 1} bg-white p-8 md:p-10 rounded-sm border border-romolo-border relative`}
            >
              {/* Quote mark */}
              <span className="font-[var(--font-serif)] text-7xl text-romolo-red/15 absolute top-4 left-6 leading-none">
                &ldquo;
              </span>

              <blockquote className="relative z-10">
                <p className="font-[var(--font-serif)] text-lg md:text-xl text-romolo-charcoal leading-relaxed italic mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <footer>
                  <div className="w-8 h-[1px] bg-romolo-red mb-4" />
                  <cite className="not-italic">
                    <span className="block text-sm font-medium text-romolo-charcoal">
                      {t.author}
                    </span>
                    <span className="block text-xs text-romolo-warm-gray mt-1">
                      {t.role}
                    </span>
                  </cite>
                </footer>
              </blockquote>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
