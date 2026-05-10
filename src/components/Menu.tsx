"use client";

import Image from "next/image";
import { useState } from "react";
import { MENU_DATA, type MenuItem } from "@/lib/data";
import { useOrder } from "./OrderProvider";
import { MenuGalleryModal } from "./MenuGalleryModal";

export default function Menu() {
  const { open } = useOrder();
  const [galleryItem, setGalleryItem] = useState<MenuItem | null>(null);

  return (
    <>
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
            How to <span className="italic">order</span>
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
                    <button
                      type="button"
                      onClick={() => setGalleryItem(item)}
                      aria-haspopup="dialog"
                      aria-expanded={galleryItem?.id === item.id}
                      aria-label={`Open photo gallery for ${item.name}`}
                      className="relative aspect-square w-full rounded-sm overflow-hidden bg-romolo-cream border border-romolo-border p-0 cursor-pointer text-left shadow-none block focus:outline-none focus-visible:ring-2 focus-visible:ring-romolo-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt=""
                          fill
                          className="object-cover scale-[1.2] transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.25]"
                          sizes="(min-width: 1024px) 26vw, (min-width: 768px) 32vw, 48vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[11px] tracking-[0.15em] text-romolo-warm-gray text-center px-3">
                            Coming Soon
                          </span>
                        </div>
                      )}
                    </button>
                    <figcaption className="pt-4">
                      <h4 className="font-[var(--font-serif)] text-lg md:text-xl font-medium m-0 leading-snug">
                        <button
                          type="button"
                          onClick={() => setGalleryItem(item)}
                          aria-haspopup="dialog"
                          aria-expanded={galleryItem?.id === item.id}
                          className="inline-block origin-left bg-transparent border-0 p-0 text-left text-romolo-charcoal underline-offset-[6px] decoration-romolo-red/70 cursor-pointer transition-all duration-200 ease-out hover:text-romolo-red hover:underline hover:scale-[1.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-romolo-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-sm"
                        >
                          {item.name}
                        </button>
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

        {/* How to Order — step-by-step visual guide */}
        <div className="mt-28 md:mt-36 animate-on-scroll">
          <div className="flex items-center gap-6 mb-8">
            <span aria-hidden className="block h-px w-16 md:w-24 bg-romolo-red/60" />
            <p className="text-base md:text-xl tracking-[0.3em] uppercase text-romolo-red font-medium">
              Build Your Cannoli
            </p>
          </div>
          <h3 className="font-[var(--font-serif)] text-4xl md:text-5xl lg:text-6xl font-light text-romolo-charcoal leading-[0.95] tracking-[-0.01em] mb-6">
            Four <span className="italic">choices</span>
          </h3>
          <p className="max-w-2xl text-[17px] text-romolo-warm-gray leading-relaxed mb-14">
            Every cannoli is made to order. Pick your size, shell, filling, and garnish — we fill it fresh while you watch.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6">
            {[
              {
                step: 1,
                label: "Pick your size",
                choices: ["Full Size", "Mini", "Kit (6-pack)"],
              },
              {
                step: 2,
                label: "Choose your shell",
                choices: ["Chocolate", "Plain"],
              },
              {
                step: 3,
                label: "Pick your filling",
                choices: ["Original Ricotta", "Chocolate", "Tiramisu", "Pistachio", "Lemon Cello", "Strawberry"],
              },
              {
                step: 4,
                label: "Add a garnish",
                choices: ["Pistachio", "Chocolate Chips", "Toffee", "Cherries"],
              },
            ].map((s) => (
              <div key={s.step} className="animate-on-scroll">
                <div className="relative aspect-[4/3] w-full rounded-sm overflow-hidden bg-romolo-cream border border-romolo-border mb-5 flex items-center justify-center">
                  <span className="font-[var(--font-serif)] text-6xl font-light text-romolo-border">
                    {s.step}
                  </span>
                </div>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-romolo-red text-white text-[13px] font-bold shrink-0">
                    {s.step}
                  </span>
                  <h4 className="font-[var(--font-serif)] text-xl md:text-2xl font-medium text-romolo-charcoal m-0">
                    {s.label}
                  </h4>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {s.choices.map((c) => (
                    <span
                      key={c}
                      className="px-3 py-1.5 text-[12px] text-romolo-warm-gray border border-romolo-border rounded-full"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
    <MenuGalleryModal item={galleryItem} onClose={() => setGalleryItem(null)} />
    </>
  );
}
