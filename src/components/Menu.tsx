"use client";

import Image from "next/image";
import { MENU_DATA } from "@/lib/data";
import { useOrder } from "./OrderProvider";

export default function Menu() {
  const { open } = useOrder();

  return (
    <section id="menu" className="py-24 md:py-36 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <div className="mb-14 md:mb-20 animate-on-scroll">
          <div className="flex items-center gap-6 mb-8">
            <span aria-hidden className="block h-px w-16 md:w-24 bg-romolo-red/60" />
            <p className="text-base md:text-xl tracking-[0.3em] uppercase text-romolo-red font-medium">
              La Pasticceria
            </p>
          </div>
          <h2 className="font-[var(--font-serif)] text-5xl md:text-6xl lg:text-7xl font-light text-romolo-charcoal leading-[0.95] tracking-[-0.01em]">
            What we <span className="italic">offer</span>
          </h2>
          <p className="mt-10 max-w-2xl text-[17px] text-romolo-warm-gray leading-relaxed">
            A rotating selection of cannoli, dolci, and gelato — made fresh each morning. For today&apos;s live menu, prices, and pickup times,{" "}
            <button
              type="button"
              onClick={open}
              className="underline underline-offset-4 decoration-romolo-red/60 hover:decoration-romolo-red text-romolo-charcoal transition-colors"
            >
              start an order
            </button>
            .
          </p>
        </div>

        {/* Gallery — grouped by category, image-forward */}
        <div className="space-y-20 md:space-y-28">
          {MENU_DATA.map((category, catIdx) => (
            <div key={category.category} className={`animate-on-scroll delay-${catIdx + 1}`}>
              <div className="flex items-baseline justify-between gap-6 mb-6">
                <h3 className="font-[var(--font-serif)] text-3xl md:text-4xl font-light text-romolo-charcoal m-0">
                  {category.category}
                </h3>
                <span className="text-[11px] tracking-[0.2em] uppercase text-romolo-warm-gray">
                  {category.items.length} {category.items.length === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="h-[1px] bg-romolo-border mb-10 animate-draw-line origin-left" />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-7">
                {category.items.map((item) => (
                  <figure key={item.id} className="group">
                    <div className="relative aspect-square rounded-sm overflow-hidden bg-romolo-cream border border-romolo-border">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
                          sizes="(min-width: 1024px) 26vw, (min-width: 768px) 32vw, 48vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray text-center px-3">
                            {item.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <figcaption className="pt-4">
                      <h4 className="font-[var(--font-serif)] text-lg md:text-xl font-medium text-romolo-charcoal m-0 leading-snug">
                        {item.name}
                      </h4>
                      {item.description && (
                        <p className="text-[13px] text-romolo-warm-gray mt-1.5 leading-relaxed m-0">
                          {item.description}
                        </p>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Edge-to-edge red Start an Order banner */}
      <button
        type="button"
        onClick={open}
        className="mt-20 md:mt-28 w-full bg-romolo-red hover:bg-romolo-red-dark transition-colors duration-300 text-white text-center py-7 md:py-9 text-[14px] md:text-[16px] font-bold tracking-[0.2em] uppercase"
      >
        Start an Order
      </button>
    </section>
  );
}
