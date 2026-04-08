"use client";

export default function Footer() {
  return (
    <footer className="bg-romolo-charcoal text-white">
      {/* Newsletter band */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="font-[var(--font-serif)] text-2xl md:text-3xl font-light mb-1">
                Stay in the <span className="italic">Loop</span>
              </h3>
              <p className="text-sm text-white/50">
                New flavors, seasonal specials, and the occasional love letter.
              </p>
            </div>
            <form
              className="flex w-full md:w-auto"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 md:w-64 px-4 py-3 bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-romolo-red/60 transition-colors"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-romolo-red text-white text-[11px] font-bold tracking-[0.15em] uppercase hover:bg-romolo-red-dark transition-colors shrink-0"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h4 className="font-[var(--font-serif)] text-2xl font-semibold text-romolo-red mb-3">
              Romolo&apos;s
            </h4>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs">
              Handcrafted Sicilian desserts made with love since 1968. Three
              generations, one recipe, infinite passion.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h5 className="text-[11px] tracking-[0.2em] uppercase text-white/40 mb-5 font-medium">
              Explore
            </h5>
            <ul className="space-y-3">
              {["Heritage", "Our Process", "Menu", "Testimonials"].map((item) => (
                <li key={item}>
                  <a
                    href={`#${item.toLowerCase().replace(/\s+/g, "-").replace("our-", "")}`}
                    className="text-sm text-white/60 hover:text-romolo-red transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h5 className="text-[11px] tracking-[0.2em] uppercase text-white/40 mb-5 font-medium">
              Contact
            </h5>
            <ul className="space-y-3 text-sm text-white/60">
              <li>81 W. 37th Ave.</li>
              <li>San Mateo, CA 94403</li>
              <li>
                <a href="tel:+16505740625" className="hover:text-romolo-red transition-colors">
                  (650) 574-0625
                </a>
              </li>
              <li>
                <a href="mailto:hello@romolocannoli.com" className="hover:text-romolo-red transition-colors">
                  hello@romolocannoli.com
                </a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h5 className="text-[11px] tracking-[0.2em] uppercase text-white/40 mb-5 font-medium">
              Follow Us
            </h5>
            <div className="flex gap-3">
              {[
                {
                  name: "Instagram",
                  href: "https://www.instagram.com/romoloscannoli/",
                  path: "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 017.8 2zm-.2 2A3.6 3.6 0 004 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 003.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6zm9.65 1.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5zM12 7a5 5 0 110 10 5 5 0 010-10zm0 2a3 3 0 100 6 3 3 0 000-6z",
                },
                {
                  name: "Facebook",
                  href: "https://www.facebook.com/RomolosCannoli/",
                  path: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z",
                },
              ].map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target={social.href.startsWith("http") ? "_blank" : undefined}
                  rel={social.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  aria-label={social.name}
                  className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center hover:border-romolo-red hover:bg-romolo-red/10 transition-all duration-300 group"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-white/50 group-hover:text-romolo-red transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} Romolo&apos;s Cannoli. All rights reserved.
          </p>
          <div className="flex flex-col items-center sm:items-end gap-3">
            <div className="flex gap-6 text-xs text-white/30">
              <a href="#" className="hover:text-white/60 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-white/60 transition-colors">
                Terms of Service
              </a>
            </div>
            <a
              href="https://vaderlabs.co/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Design by Vader Labs
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
