"use client";

export default function Contact() {
  return (
    <section id="contact" className="py-24 md:py-36 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left: Info */}
          <div className="animate-on-scroll">
            <p className="text-[11px] tracking-[0.3em] uppercase text-romolo-red font-medium mb-4">
              Get in Touch
            </p>
            <h2 className="font-[var(--font-serif)] text-4xl md:text-5xl font-light text-romolo-charcoal mb-6">
              We&apos;d Love to
              <br />
              <span className="italic">Hear From You</span>
            </h2>
            <p className="text-romolo-warm-gray leading-relaxed mb-10 max-w-md">
              Whether you&apos;re planning a celebration, have a question about
              our menu, or just want to say hello — drop us a line. We read every
              message.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-romolo-blue flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-romolo-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-romolo-charcoal">Email</p>
                  <p className="text-sm text-romolo-warm-gray">hello@romolocannoli.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-romolo-blue flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-romolo-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-romolo-charcoal">Phone</p>
                  <p className="text-sm text-romolo-warm-gray">(555) 123-4567</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-romolo-blue flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-romolo-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-romolo-charcoal">Hours</p>
                  <p className="text-sm text-romolo-warm-gray">
                    Tue — Sat: 11:00 AM — 6:00 PM
                    <br />
                    Sun: 12:00 PM — 4:00 PM
                    <br />
                    Monday: Closed
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Contact form */}
          <div className="animate-on-scroll delay-2">
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="Your name"
                    className="w-full px-4 py-3 bg-romolo-cream border border-romolo-border rounded-sm text-sm text-romolo-charcoal placeholder:text-romolo-warm-gray/50 focus:outline-none focus:border-romolo-red/40 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-romolo-cream border border-romolo-border rounded-sm text-sm text-romolo-charcoal placeholder:text-romolo-warm-gray/50 focus:outline-none focus:border-romolo-red/40 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray mb-2">
                  Subject
                </label>
                <select className="w-full px-4 py-3 bg-romolo-cream border border-romolo-border rounded-sm text-sm text-romolo-charcoal focus:outline-none focus:border-romolo-red/40 transition-colors appearance-none">
                  <option>General Inquiry</option>
                  <option>Catering & Events</option>
                  <option>Wholesale</option>
                  <option>Feedback</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] tracking-[0.15em] uppercase text-romolo-warm-gray mb-2">
                  Message
                </label>
                <textarea
                  rows={5}
                  placeholder="Tell us what's on your mind..."
                  className="w-full px-4 py-3 bg-romolo-cream border border-romolo-border rounded-sm text-sm text-romolo-charcoal placeholder:text-romolo-warm-gray/50 focus:outline-none focus:border-romolo-red/40 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-10 py-3.5 bg-romolo-red text-white text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-romolo-red-dark transition-colors duration-300"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
