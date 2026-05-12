import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";
import { JsonLd } from "@/lib/seo/JsonLd";
import { buildBreadcrumbSchema } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms governing your use of romoloscannoli.com and orders placed with Romolo's Cannoli.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", url: `${SITE_URL}/` },
  { name: "Terms of Service", url: `${SITE_URL}/terms` },
]);

const LAST_UPDATED = "May 8, 2026";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <JsonLd data={breadcrumb} />
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
            Terms of Service
          </h1>
          <p className="text-sm text-romolo-warm-gray mb-12">
            Last updated: {LAST_UPDATED}
          </p>

          <div className="space-y-10 text-[15px] leading-relaxed text-romolo-charcoal/85">
            <section>
              <p>
                These Terms of Service (&ldquo;Terms&rdquo;) govern your use
                of{" "}
                <Link href="/" className="text-romolo-red hover:underline">
                  romolocannoli.com
                </Link>{" "}
                and any orders you place with Romolo&apos;s Cannoli
                (&ldquo;Romolo&apos;s,&rdquo; &ldquo;we,&rdquo;
                &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By using the site or
                placing an order, you agree to these Terms. If you do not
                agree, please do not use the site.
              </p>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Eligibility
              </h2>
              <p>
                You must be at least 18 years old, or have permission from a
                parent or legal guardian, to place an order. By ordering, you
                represent that the information you provide is accurate and
                that you are authorized to use the payment method you submit.
              </p>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Orders and pickup
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  All orders are subject to availability and confirmation. We
                  may decline or cancel an order at our discretion (for
                  example, if an item is sold out, the order cannot be
                  fulfilled in the requested time, or we suspect fraud).
                </li>
                <li>
                  Pickup times are scheduled in our local time zone (Pacific
                  Time). Please arrive on time so your cannoli are at their
                  best.
                </li>
                <li>
                  You are responsible for picking up your order. Orders not
                  picked up may be discarded after a reasonable hold period
                  and are not refundable.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Pricing and payment
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Prices are listed in U.S. dollars and may change at any
                  time. The price you pay is the price shown at checkout.
                </li>
                <li>
                  Applicable taxes and fees are calculated at checkout.
                </li>
                <li>
                  Payments are processed by Square. By submitting payment
                  information, you authorize us and Square to charge your
                  selected payment method.
                </li>
                <li>
                  We make commercially reasonable efforts to display
                  accurate prices and product information, but errors can
                  happen. If we discover a pricing error after your order is
                  placed, we will contact you to confirm or cancel.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Cancellations and refunds
              </h2>
              <p>
                Because our products are made fresh, cancellations and
                refunds are handled on a case-by-case basis. If something
                isn&apos;t right with your order, contact us as soon as
                possible at{" "}
                <a
                  href="mailto:info@romoloscannoli.com"
                  className="text-romolo-red hover:underline"
                >
                  info@romoloscannoli.com
                </a>{" "}
                or{" "}
                <a
                  href="tel:+16505740625"
                  className="text-romolo-red hover:underline"
                >
                  (650) 574-0625
                </a>{" "}
                and we&apos;ll do our best to make it right.
              </p>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Allergens and food safety
              </h2>
              <p>
                Our products are made in a kitchen that handles wheat, dairy,
                eggs, tree nuts, and other common allergens. We cannot
                guarantee that any item is free of cross-contact. If you
                have a food allergy or sensitivity, please contact us before
                ordering. You are responsible for evaluating whether our
                products are appropriate for you and anyone you serve them
                to.
              </p>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Acceptable use
              </h2>
              <p className="mb-3">You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the site for any unlawful purpose or in violation of these Terms.</li>
                <li>Submit false, misleading, or fraudulent orders.</li>
                <li>
                  Attempt to interfere with, disrupt, reverse-engineer, or
                  gain unauthorized access to any part of the site or its
                  systems.
                </li>
                <li>Use any automated means to scrape or collect data from the site.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Intellectual property
              </h2>
              <p>
                The Romolo&apos;s name, logo, recipes, photography, copy,
                and other content on this site are owned by Romolo&apos;s or
                our licensors and are protected by U.S. and international
                intellectual property laws. You may not copy, reproduce, or
                redistribute any of it without our prior written permission,
                except for personal, non-commercial use of the site.
              </p>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Disclaimers
              </h2>
              <p>
                The site and our products are provided &ldquo;as is&rdquo;
                and &ldquo;as available.&rdquo; To the fullest extent
                permitted by law, we disclaim all warranties, express or
                implied, including warranties of merchantability, fitness
                for a particular purpose, and non-infringement. We do not
                warrant that the site will be uninterrupted, error-free, or
                free of harmful components.
              </p>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Limitation of liability
              </h2>
              <p>
                To the fullest extent permitted by law, Romolo&apos;s and
                its owners, employees, and affiliates will not be liable for
                any indirect, incidental, special, consequential, or
                punitive damages arising out of or related to your use of
                the site or our products. Our total liability for any claim
                arising from an order will not exceed the amount you paid
                for that order.
              </p>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Governing law
              </h2>
              <p>
                These Terms are governed by the laws of the State of
                California, without regard to its conflict-of-laws
                principles. Any dispute arising from these Terms or your
                use of the site will be brought exclusively in the state or
                federal courts located in San Mateo County, California, and
                you consent to the personal jurisdiction of those courts.
              </p>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Changes to these Terms
              </h2>
              <p>
                We may update these Terms from time to time. The updated
                version will be posted on this page with a new &ldquo;Last
                updated&rdquo; date. Continued use of the site after changes
                are posted means you accept the new Terms.
              </p>
            </section>

            <section>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold mb-3">
                Contact us
              </h2>
              <p>Questions about these Terms? Reach out:</p>
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
