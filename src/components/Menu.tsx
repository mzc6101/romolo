"use client";

import Image from "next/image";
import { useState } from "react";
import { MENU_DATA, fmt } from "@/lib/data";
import { useOrder } from "./OrderProvider";

export default function Menu() {
  const { open } = useOrder();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <section id="menu" className="py-24 md:py-36 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <div className="mb-12 md:mb-16 animate-on-scroll">
          <div className="flex items-center gap-6 mb-8">
            <span aria-hidden className="block h-px w-16 md:w-24 bg-romolo-red/60" />
            <p className="text-base md:text-xl tracking-[0.3em] uppercase text-romolo-red font-medium">
              Il Menu
            </p>
          </div>
          <h2 className="font-[var(--font-serif)] text-5xl md:text-6xl lg:text-7xl font-light text-romolo-charcoal leading-[0.95] tracking-[-0.01em]">
            Our <span className="italic">Menu</span>
          </h2>
          <p className="mt-10 max-w-2xl text-[17px] text-romolo-warm-gray leading-relaxed">
            Each cannolo is filled to order to preserve that perfect crunch. Flavors rotate every two to three days — what&apos;s in the case today is what we made today.
          </p>
        </div>

        {/* Menu categories */}
        <div className="space-y-14 md:space-y-18 mt-14">
          {MENU_DATA.map((category, catIdx) => (
            <div key={category.category} className={`animate-on-scroll delay-${catIdx + 1}`}>
              <h3 className="font-[var(--font-serif)] text-2xl md:text-3xl font-light text-romolo-charcoal mb-2">
                {category.category}
              </h3>
              <div className="h-[1px] bg-romolo-border mb-6 animate-draw-line origin-left" />

              <div className="grid sm:grid-cols-2 gap-4">
                {category.items.map((item) => {
                  const isHov = hoveredItem === item.id;
                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setHoveredItem(item.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className="flex gap-4 p-4 rounded-sm cursor-pointer transition-colors duration-300"
                      style={{ background: isHov ? "var(--color-romolo-cream)" : "transparent" }}
                    >
                      <div
                        className={`shrink-0 bg-romolo-cream rounded-sm border border-romolo-border transition-all duration-300 relative overflow-hidden ${
                          item.imageUrl ? "" : "flex items-center justify-center"
                        }`}
                        style={{
                          width: isHov ? 96 : 80,
                          height: isHov ? 96 : 80,
                        }}
                      >
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        ) : (
                          <span className="text-[10px] text-romolo-warm-gray text-center leading-tight px-1">
                            [ {item.name.toLowerCase()} ]
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-[var(--font-serif)] text-lg font-medium text-romolo-charcoal m-0">
                            {item.name}
                          </h4>
                          <span className="font-[var(--font-serif)] text-lg font-semibold text-romolo-red shrink-0">
                            {fmt(item.price)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-[13px] text-romolo-warm-gray mt-1.5 leading-relaxed m-0">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <p className="text-romolo-warm-gray text-sm mb-4">
            Catering & bulk orders for events, weddings, corporate.
          </p>
          <button
            type="button"
            onClick={open}
            className="inline-block px-8 py-3.5 bg-romolo-red text-white text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-romolo-red-dark transition-colors duration-300 rounded-sm"
          >
            Start an Order
          </button>
        </div>
      </div>

    </section>
  );
}
