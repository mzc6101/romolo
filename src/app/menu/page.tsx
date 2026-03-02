"use client";

import { useState } from "react";
import { menuItems, categories } from "@/lib/menu-data";
import { ProductCard } from "@/components/ProductCard";

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("cannoli");

  const filteredItems = menuItems.filter((item) => item.category === activeCategory);
  const activeCat = categories.find((c) => c.id === activeCategory);

  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="py-16 px-6 bg-cream-dark border-b border-border">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm tracking-[0.3em] text-gold uppercase mb-3">Explore</p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-espresso mb-4">Our Menu</h1>
          <p className="text-muted max-w-lg mx-auto">
            Every item is crafted with authentic Sicilian recipes and filled with love. Browse our selection and order for pickup.
          </p>
        </div>
      </section>

      {/* Category tabs */}
      <section className="sticky top-20 z-40 bg-cream/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex overflow-x-auto gap-1 py-3 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-5 py-2.5 text-sm tracking-wide rounded-full whitespace-nowrap transition-all duration-200 ${
                  activeCategory === cat.id
                    ? "bg-espresso text-cream"
                    : "text-brown hover:bg-cream-dark"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Category header */}
          <div className="mb-8">
            <h2 className="font-serif text-3xl text-espresso mb-2">{activeCat?.name}</h2>
            <p className="text-muted">{activeCat?.description}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* Wholesale CTA */}
      <section className="py-16 px-6 bg-cream-dark border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-2xl sm:text-3xl text-espresso mb-3">
            Need a larger order?
          </h2>
          <p className="text-muted mb-6">
            We offer wholesale pricing for events, restaurants, and catering. Contact us to discuss your needs.
          </p>
          <a
            href="tel:6505740625"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-sm tracking-widest text-espresso border border-espresso rounded-full hover:bg-espresso hover:text-cream transition-colors uppercase font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            Call Us
          </a>
        </div>
      </section>
    </div>
  );
}
