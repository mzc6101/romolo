export default function Location() {
  return (
    <section id="location" className="py-24 md:py-36 bg-[#d8e2dc]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Google Maps Embed */}
          <div className="animate-on-scroll order-2 lg:order-1">
            <div className="aspect-[4/3] rounded-sm overflow-hidden border border-white/80">
              <iframe
                src="https://maps.google.com/maps?q=81+37th+Ave,+San+Mateo,+CA+94403&t=&z=15&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Romolo's Cannoli location - 81 37th Ave, San Mateo, CA 94403"
              />
            </div>
          </div>

          {/* Location info */}
          <div className="animate-on-scroll delay-2 order-1 lg:order-2">
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#2d6a4f] font-medium mb-4">
              Visit Us
            </p>
            <h2 className="font-[var(--font-serif)] text-4xl md:text-5xl font-light text-[#1a1a1a] mb-6">
              Find Our
              <br />
              <span className="italic">Bottega</span>
            </h2>

            <div className="space-y-8">
              {/* Address */}
              <div>
                <h3 className="text-[11px] tracking-[0.15em] uppercase text-[#5a6b5e] mb-2 font-medium">
                  Address
                </h3>
                <p className="font-[var(--font-serif)] text-xl text-[#1a1a1a] leading-relaxed">
                  81 W. 37th Ave.
                  <br />
                  San Mateo, CA 94403
                </p>
              </div>

              {/* Hours */}
              <div>
                <h3 className="text-[11px] tracking-[0.15em] uppercase text-[#5a6b5e] mb-3 font-medium">
                  Opening Hours
                </h3>
                <div className="space-y-2">
                  {[
                    { day: "Tuesday — Saturday", hours: "11:00 AM — 6:00 PM" },
                    { day: "Sunday", hours: "12:00 PM — 4:00 PM" },
                    { day: "Monday", hours: "Closed" },
                  ].map((row) => (
                    <div key={row.day} className="flex justify-between items-center py-2 border-b border-white/50">
                      <span className="text-sm text-[#1a1a1a]">{row.day}</span>
                      <span
                        className={`text-sm font-medium ${
                          row.hours === "Closed"
                            ? "text-[#2d6a4f]"
                            : "text-[#1a1a1a]"
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
                <p className="text-sm text-[#5a6b5e] leading-relaxed">
                  <span className="font-medium text-[#1a1a1a]">Getting here: </span>
                  Street parking available on W. 37th Ave. and nearby. The Hillsdale
                  Caltrain station is a short walk. We&apos;re the shop with the red awning
                  — you can&apos;t miss it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
