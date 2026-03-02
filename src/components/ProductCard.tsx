"use client";

import type { MenuItem } from "@/lib/menu-data";
import { useCart } from "./CartProvider";

const categoryGradients: Record<string, { bg: string; accent: string; icon: string }> = {
  cannoli: {
    bg: "from-amber-50 via-orange-50 to-yellow-50",
    accent: "bg-amber-100/60",
    icon: "M12 3c-1.5 0-3 1-4 2.5S6 8 6 9.5C6 12 8 14 10 15c.5.2 1 .5 2 .5s1.5-.3 2-.5c2-1 4-3 4-5.5 0-1.5-.5-3-1.5-4S13.5 3 12 3z",
  },
  gelato: {
    bg: "from-pink-50 via-rose-50 to-fuchsia-50",
    accent: "bg-pink-100/60",
    icon: "M12 2C9 2 7 4 7 6.5c0 1.5.5 2.5 1.5 3.5H7l1 12h8l1-12h-1.5c1-.8 1.5-2 1.5-3.5C17 4 15 2 12 2z",
  },
  desserts: {
    bg: "from-rose-50 via-amber-50 to-orange-50",
    accent: "bg-rose-100/60",
    icon: "M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z",
  },
  kits: {
    bg: "from-teal-50 via-emerald-50 to-cyan-50",
    accent: "bg-teal-100/60",
    icon: "M20 7H4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM9 5h6v2H9V5z",
  },
};

export function ProductCard({ item }: { item: MenuItem }) {
  const { addItem } = useCart();
  const style = categoryGradients[item.category] || categoryGradients.desserts;

  return (
    <div className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:shadow-espresso/5 transition-all duration-300 hover:-translate-y-1">
      {/* Image area with gradient */}
      <div className={`relative aspect-[4/3] bg-gradient-to-br ${style.bg} overflow-hidden`}>
        {/* Decorative circles */}
        <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full ${style.accent} group-hover:scale-125 transition-transform duration-700`} />
        <div className={`absolute -bottom-6 -left-6 w-24 h-24 rounded-full ${style.accent} group-hover:scale-110 transition-transform duration-700 delay-100`} />

        {/* Center decorative element */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className={`w-20 h-20 rounded-full ${style.accent} flex items-center justify-center group-hover:scale-110 transition-transform duration-500`}>
              <svg className="w-10 h-10 text-gold/40" fill="currentColor" viewBox="0 0 24 24">
                <path d={style.icon} />
              </svg>
            </div>
          </div>
        </div>

        {/* Item name overlay */}
        <div className="absolute bottom-3 left-3 right-3">
          <span className="text-xs font-medium tracking-wider uppercase text-brown/40">
            {item.category === "cannoli" ? "Cannoli" : item.category === "gelato" ? "Gelato" : item.category === "kits" ? "Take Home" : "Dessert"}
          </span>
        </div>

        {item.badge && (
          <span className="absolute top-3 left-3 px-3 py-1 text-[11px] font-medium tracking-wide uppercase bg-gold text-cream rounded-full shadow-sm">
            {item.badge}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-serif text-lg text-espresso leading-tight">{item.name}</h3>
          <span className="text-gold font-medium text-sm whitespace-nowrap">${item.price.toFixed(2)}</span>
        </div>
        <p className="text-sm text-muted leading-relaxed line-clamp-2 mb-4">{item.description}</p>
        <button
          onClick={() => addItem(item)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm tracking-wide text-espresso border border-espresso rounded-full hover:bg-espresso hover:text-cream transition-all duration-300 uppercase font-medium group-hover:border-gold group-hover:text-gold group-hover:hover:bg-gold group-hover:hover:text-cream"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add to Order
        </button>
      </div>
    </div>
  );
}
