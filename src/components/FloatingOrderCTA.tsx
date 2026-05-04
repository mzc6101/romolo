"use client";

import { useEffect, useState } from "react";
import { useOrder } from "./OrderProvider";

export default function FloatingOrderCTA() {
  const { open } = useOrder();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Start an order"
      className={`fixed bottom-5 right-5 md:bottom-8 md:right-8 z-40 inline-flex items-center gap-2 pl-5 pr-4 md:pl-7 md:pr-6 py-3 md:py-3.5 bg-romolo-red text-white text-[12px] md:text-[13px] font-bold tracking-[0.15em] uppercase rounded-full shadow-[0_14px_38px_rgba(236,56,40,0.4)] hover:bg-romolo-red-dark transition-all duration-500 ease-[var(--ease-out-expo)] ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-6 pointer-events-none"
      }`}
    >
      <span
        aria-hidden
        className="relative inline-block w-1.5 h-1.5 rounded-full bg-white/90"
      />
      Start an Order
      <span aria-hidden className="text-base leading-none">→</span>
    </button>
  );
}
