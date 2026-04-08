export default function Location() {
  return (
    <section id="location" className="py-24 md:py-36 bg-romolo-blue">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Map placeholder */}
          <div className="animate-on-scroll order-2 lg:order-1">
            <div className="aspect-[4/3] bg-white/60 rounded-sm flex items-center justify-center border border-white/80">
              <div className="text-center p-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-4 text-romolo-warm-gray/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <p className="text-romolo-warm-gray text-sm tracking-wide">
                  [ Google Maps Embed — Store Location ]
                </p>
              </div>
            </div>
          </div>

          {/* Location info */}
          <div className="animate-on-scroll delay-2 order-1 lg:order-2">
            <p className="text-[11px] tracking-[0.3em] uppercase text-romolo-red font-medium mb-4">
              Visit Us
            </p>
            <h2 className="font-[var(--font-serif)] text-4xl md:text-5xl font-light text-romolo-charcoal mb-6">
              Find Our
              <br />
              <span className="italic">Bottega</span>
            </h2>

            <div className="space-y-8">
              {/* Address */}
              <div>
                <h3 className="text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray mb-2 font-medium">
                  Address
                </h3>
                <p className="font-[var(--font-serif)] text-xl text-romolo-charcoal leading-relaxed">
                  123 Mulberry Street
                  <br />
                  Little Italy, New York
                  <br />
                  NY 10013
                </p>
              </div>

              {/* Hours */}
              <div>
                <h3 className="text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray mb-3 font-medium">
                  Opening Hours
                </h3>
                <div className="space-y-2">
                  {[
                    { day: "Tuesday — Friday", hours: "9:00 AM — 6:00 PM" },
                    { day: "Saturday", hours: "8:00 AM — 7:00 PM" },
                    { day: "Sunday", hours: "10:00 AM — 4:00 PM" },
                    { day: "Monday", hours: "Closed" },
                  ].map((row) => (
                    <div key={row.day} className="flex justify-between items-center py-2 border-b border-white/50">
                      <span className="text-sm text-romolo-charcoal">{row.day}</span>
                      <span
                        className={`text-sm font-medium ${
                          row.hours === "Closed"
                            ? "text-romolo-red"
                            : "text-romolo-charcoal"
                        }`}
                      >
                        {row.hours}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parking note */}
              <div className="bg-white/50 p-5 rounded-sm border border-white/80">
                <p className="text-sm text-romolo-warm-gray leading-relaxed">
                  <span className="font-medium text-romolo-charcoal">Getting here: </span>
                  Street parking available on Mulberry St. Nearest subway: Spring St
                  (6 train) or Bowery (J/Z). We&apos;re the shop with the red awning —
                  you can&apos;t miss it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
