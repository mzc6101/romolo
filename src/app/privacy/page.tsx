import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Romolo's Cannoli",
  description:
    "How Romolo's Cannoli collects, uses, and protects your personal information.",
};

const LAST_UPDATED = "May 8, 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-romolo-border">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/RmLogo.png"
              alt="Romolo's Cannoli"
              width={120}
              height={32}
              className="h-7 w-auto object-contain"
            />
            <span className="font-[var(--font-serif)] text-xl font-semibold text-romolo-charcoal">
              Romolo&apos;s
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs tracking-[0.18em] uppercase text-romolo-warm-gray hover:text-romolo-red transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-6 lg:px-10 py-16 lg:py-20">
          <p className="text-xs tracking-[0.2em] uppercase text-romolo-red font-medium mb-4">
            Legal
          </p>
          <h1 className="font-[var(--font-serif)] text-4xl lg:text-5xl font-semibold text-romolo-charcoal mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-romolo-warm-gray mb-12">
            Last updated: {LAST_UPDATED}
          </p>

          <div className="space-y-10 text-[15px] leading-relaxed text-romolo-charcoal/85">
            <section>
              <p>
                Romolo&apos;s Cannoli (&ldquo;Romolo&apos;s,&rdquo; &ldquo;we,&rdquo;
                &ldquo;us,&rdquo; or &ldquo;our&rdquo;) respects your privacy.
                This Privacy Policy explains what information we collect when
                you visit{" "}
                <Link href="/" className="text-romolo-red hover:underline">
                  romolocannoli.com
                </Link>{" "}
                or place an order, how we use it, and the choices you have. By
                using our site or services, you agree to the practices
                described below.
              </p>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Information we collect
              </h2>
              <p className="mb-3">
                We collect only the information needed to take your order and
                run our business:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Order details</strong> — name, email address, phone
                  number, pickup time, and the items you select.
                </li>
                <li>
                  <strong>Payment information</strong> — processed securely by
                  Square. We do not store your full card number on our
                  servers.
                </li>
                <li>
                  <strong>Site usage data</strong> — basic technical
                  information such as your browser type, device, and pages
                  visited, collected through standard server logs and
                  analytics.
                </li>
                <li>
                  <strong>Communications</strong> — anything you send us by
                  email, phone, or contact form.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                How we use your information
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>To prepare and fulfill your order.</li>
                <li>
                  To contact you about your order, including pickup
                  confirmations or issues with availability.
                </li>
                <li>
                  To process payments and prevent fraud, through our payment
                  processor.
                </li>
                <li>To improve our website and ordering experience.</li>
                <li>
                  To comply with legal obligations such as tax and
                  recordkeeping requirements.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                How we share your information
              </h2>
              <p className="mb-3">
                We do not sell your personal information. We share it only
                with:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Square</strong>, which processes payments and powers
                  our point-of-sale and online ordering. Square&apos;s use of
                  your payment information is governed by its own privacy
                  policy.
                </li>
                <li>
                  <strong>Service providers</strong> who help us operate the
                  site (hosting, email, analytics) under agreements that
                  require them to protect your information.
                </li>
                <li>
                  <strong>Authorities</strong> when required by law, court
                  order, or to protect the safety and rights of our customers
                  or business.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Cookies and analytics
              </h2>
              <p>
                We use a small number of cookies and similar technologies to
                keep the site working, remember your cart, and understand how
                visitors use the site. You can disable cookies in your browser
                settings, though some parts of the ordering flow may not work
                without them.
              </p>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Data retention
              </h2>
              <p>
                We keep order and contact information for as long as needed to
                fulfill your order, provide customer support, and meet legal,
                accounting, or reporting requirements. After that, we delete
                or anonymize it.
              </p>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Your choices and rights
              </h2>
              <p className="mb-3">
                Depending on where you live, you may have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Request a copy of the personal information we hold about you.</li>
                <li>Ask us to correct or delete your information.</li>
                <li>Opt out of marketing emails (we will always honor unsubscribe requests).</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, email us at{" "}
                <a
                  href="mailto:info@romoloscannoli.com"
                  className="text-romolo-red hover:underline"
                >
                  info@romoloscannoli.com
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Children&apos;s privacy
              </h2>
              <p>
                Our site is not directed to children under 13, and we do not
                knowingly collect personal information from them. If you
                believe a child has provided us with personal information,
                please contact us so we can delete it.
              </p>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Security
              </h2>
              <p>
                We use reasonable technical and organizational measures to
                protect your information, including encryption in transit and
                trusted payment processors. No method of transmission over
                the internet is fully secure, however, and we cannot guarantee
                absolute security.
              </p>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Changes to this policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. When we
                do, we will revise the &ldquo;Last updated&rdquo; date above.
                Material changes will be highlighted on this page.
              </p>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Contact us
              </h2>
              <p>
                Questions about this Privacy Policy or your information?
                Reach out at:
              </p>
              <address className="not-italic mt-3 text-romolo-charcoal/80">
                Romolo&apos;s Cannoli
                <br />
                81 W. 37th Ave.
                <br />
                San Mateo, CA 94403
                <br />
                <a
                  href="mailto:info@romoloscannoli.com"
                  className="text-romolo-red hover:underline"
                >
                  info@romoloscannoli.com
                </a>
                <br />
                <a
                  href="tel:+16505740625"
                  className="text-romolo-red hover:underline"
                >
                  (650) 574-0625
                </a>
              </address>
            </section>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
