"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "./CartProvider";
import { CartDrawer } from "./CartDrawer";

export function Navbar() {
  const { totalItems, setIsCartOpen } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-espresso hover:text-gold transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                )}
              </svg>
            </button>

            {/* Left nav */}
            <div className="hidden lg:flex items-center gap-8">
              <Link href="/menu" className="text-sm tracking-wide text-brown hover:text-gold transition-colors uppercase">
                Menu
              </Link>
              <Link href="/about" className="text-sm tracking-wide text-brown hover:text-gold transition-colors uppercase">
                Our Story
              </Link>
            </div>

            {/* Logo */}
            <Link href="/" className="absolute left-1/2 -translate-x-1/2">
              <div className="text-center">
                <h1 className="font-serif text-2xl lg:text-3xl tracking-wider text-espresso">
                  ROMOLO&apos;S
                </h1>
                <p className="text-[10px] tracking-[0.3em] text-gold uppercase -mt-0.5">
                  Cannoli & Gelato
                </p>
              </div>
            </Link>

            {/* Right nav */}
            <div className="flex items-center gap-6">
              <Link
                href="/menu"
                className="hidden lg:inline-flex items-center px-5 py-2 text-sm tracking-wide text-cream bg-espresso rounded-full hover:bg-brown transition-colors uppercase"
              >
                Order Now
              </Link>
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-espresso hover:text-gold transition-colors"
                aria-label="Open cart"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold text-cream text-xs font-medium flex items-center justify-center rounded-full">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border bg-cream/95 backdrop-blur-md">
            <div className="px-6 py-6 space-y-4">
              <Link
                href="/menu"
                onClick={() => setMobileOpen(false)}
                className="block text-sm tracking-wide text-brown hover:text-gold transition-colors uppercase"
              >
                Menu
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileOpen(false)}
                className="block text-sm tracking-wide text-brown hover:text-gold transition-colors uppercase"
              >
                Our Story
              </Link>
              <Link
                href="/menu"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center px-6 py-2.5 text-sm tracking-wide text-cream bg-espresso rounded-full hover:bg-brown transition-colors uppercase"
              >
                Order Now
              </Link>
            </div>
          </div>
        )}
      </nav>
      <CartDrawer />
    </>
  );
}
