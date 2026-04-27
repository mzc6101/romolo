"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { MENU_DATA, fmt } from "@/lib/data";
import { useOrder } from "./OrderProvider";

export default function Menu() {
  const { open, flavors, toggleFlavor } = useOrder();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [toast, setToast] = useState<{ name: string; now: boolean } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const handleToggle = (id: string) => {
    const info = toggleFlavor(id);
    if (info.name) setToast(info);
  };

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

        {/* Square sync banner */}
        <div
          className="flex items-center gap-3 mb-8 max-w-md rounded-sm px-3.5 py-2.5 text-[12px]"
          style={{
            background: "#f0f7f8",
            border: "1px solid #c7dde0",
            color: "#2a5a63",
          }}
        >
          <span className="relative inline-block w-2 h-2 rounded-full shrink-0" style={{ background: "#2da66f" }}>
            <span
              aria-hidden
              className="absolute -inset-[3px] rounded-full opacity-60"
              style={{
                border: "2px solid #2da66f",
                animation: "pulse-ring 2s ease-out infinite",
              }}
            />
          </span>
          <div>
            <strong>Live from Square</strong> — prices and availability synced{" "}
            {MENU_DATA[0].squareSyncedAt}
          </div>
        </div>

        {/* Today's flavor rotation */}
        <div className="rounded-sm bg-romolo-cream border border-romolo-border p-5 md:p-7 animate-on-scroll">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h3 className="font-[var(--font-serif)] text-2xl font-medium m-0 text-romolo-charcoal">
                Today&apos;s Flavors
              </h3>
              <p className="text-romolo-warm-gray text-[13px] mt-1 m-0">
                Rotated every 2–3 days. Toggle a flavor in Square and it disappears here.
              </p>
            </div>
            <span className="text-[11px] tracking-[0.2em] uppercase text-romolo-warm-gray">
              Updated 2 min ago
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {flavors.map((f) => (
              <button
                key={f.id}
                onClick={() => handleToggle(f.id)}
                title={`Click to ${f.available ? "disable" : "enable"} (simulates the Square modifier toggle)`}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all ${
                  f.available
                    ? "bg-white text-romolo-charcoal border border-romolo-border"
                    : "text-[#a8a39d] line-through"
                }`}
                style={{
                  background: f.available ? "white" : "rgba(0,0,0,0.04)",
                  borderStyle: f.available ? "solid" : "dashed",
                  borderColor: f.available ? "var(--color-romolo-border)" : "#c0bbb3",
                  borderWidth: 1,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: f.available ? f.color : "transparent",
                    border: f.available ? "1px solid rgba(0,0,0,0.1)" : "1px dashed #c0bbb3",
                  }}
                />
                {f.name}
              </button>
            ))}
          </div>
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

      {/* Admin toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-6 z-[80] max-w-xs px-4 py-3.5 rounded text-sm text-white"
          style={{
            background: "#1a1a1a",
            boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
            animation: "fade-up 0.3s var(--ease-out-expo)",
          }}
        >
          <div className="font-semibold mb-1">
            Square modifier {toast.now ? "enabled" : "disabled"}
          </div>
          <div className="text-xs opacity-70">
            &ldquo;{toast.name}&rdquo;{" "}
            {toast.now ? "is now selectable" : "removed from order flow"} on the website.
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.6); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
