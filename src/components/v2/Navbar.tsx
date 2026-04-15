"use client";

import { useState, useEffect } from "react";

const navLinks = [
  { label: "Heritage", href: "#heritage" },
  { label: "Our Process", href: "#process" },
  { label: "Menu", href: "#menu" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
  { label: "Visit Us", href: "#location" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileOpen]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.06)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-18 lg:h-22">
            {/* Logo */}
            <a
              href="#"
              className="flex items-center gap-2 group"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <span
                className={`font-[var(--font-serif)] text-xl lg:text-2xl font-semibold tracking-wide transition-colors duration-500 ${
                  scrolled ? "text-[#2d6a4f]" : "text-white"
                }`}
              >
                Romolo&apos;s Cannoli
              </span>
            </a>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-10">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`text-[13px] font-medium tracking-[0.08em] uppercase transition-colors duration-300 hover:text-[#2d6a4f] ${
                    scrolled ? "text-[#1a1a1a]" : "text-white/90"
                  }`}
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#menu"
                className="ml-2 px-5 py-2.5 bg-[#2d6a4f] text-white text-[12px] font-bold tracking-[0.1em] uppercase rounded-sm hover:bg-[#1b4332] transition-colors duration-300"
              >
                Order Now
              </a>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden flex flex-col gap-[5px] p-2"
              aria-label="Toggle menu"
            >
              <span
                className={`block h-[2px] w-6 transition-all duration-300 ${
                  mobileOpen
                    ? "rotate-45 translate-y-[7px] bg-[#1a1a1a]"
                    : scrolled
                    ? "bg-[#1a1a1a]"
                    : "bg-white"
                }`}
              />
              <span
                className={`block h-[2px] w-6 transition-all duration-300 ${
                  mobileOpen
                    ? "opacity-0"
                    : scrolled
                    ? "bg-[#1a1a1a]"
                    : "bg-white"
                }`}
              />
              <span
                className={`block h-[2px] w-6 transition-all duration-300 ${
                  mobileOpen
                    ? "-rotate-45 -translate-y-[7px] bg-[#1a1a1a]"
                    : scrolled
                    ? "bg-[#1a1a1a]"
                    : "bg-white"
                }`}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-white transition-all duration-500 lg:hidden ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8">
          {navLinks.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="font-[var(--font-serif)] text-3xl font-light text-[#1a1a1a] hover:text-[#2d6a4f] transition-colors"
              style={{
                transitionDelay: mobileOpen ? `${i * 60}ms` : "0ms",
                opacity: mobileOpen ? 1 : 0,
                transform: mobileOpen ? "translateY(0)" : "translateY(20px)",
                transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#menu"
            onClick={() => setMobileOpen(false)}
            className="mt-4 px-8 py-3 bg-[#2d6a4f] text-white text-sm font-bold tracking-[0.1em] uppercase rounded-sm"
            style={{
              transitionDelay: mobileOpen ? `${navLinks.length * 60}ms` : "0ms",
              opacity: mobileOpen ? 1 : 0,
              transition: "opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            Order Now
          </a>
        </div>
      </div>
    </>
  );
}
