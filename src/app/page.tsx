import { unstable_cache } from "next/cache";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Heritage from "@/components/Heritage";
import Process from "@/components/Process";
import Menu from "@/components/Menu";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import Location from "@/components/Location";
import Footer from "@/components/Footer";
import ScrollAnimator from "@/components/ScrollAnimator";
import { OrderProvider } from "@/components/OrderProvider";
import OrderFlowMount from "@/components/OrderFlowMount";
import FloatingOrderCTA from "@/components/FloatingOrderCTA";
import { getCatalog } from "@/lib/square/catalog";
import { getOpenPeriods } from "@/lib/square/hours";
import { squareLocationId } from "@/lib/square/client";
import type { MenuSnapshot } from "@/lib/square/types";
import { getReviews } from "@/lib/reviews";

// Render at request time so the build never calls Square (Railway injects
// SQUARE_* env vars at runtime, not during `next build`). The 15-min cache
// lives on the data calls below via unstable_cache.
export const dynamic = "force-dynamic";

const CACHE_SECONDS = 900;

// Bump the trailing version segment whenever the snapshot shape changes —
// it abandons the prior cached entry so deploys don't serve stale snapshots
// to a freshly deployed page (and to a dev server that's seen old data).
const cachedCatalog = unstable_cache(
  async () => getCatalog(),
  ["square-catalog", "v4"],
  { revalidate: CACHE_SECONDS },
);

const cachedHours = unstable_cache(
  async () => getOpenPeriods(),
  ["square-hours", "v4"],
  { revalidate: CACHE_SECONDS },
);

function emptySnapshot(): MenuSnapshot {
  return {
    fetchedAt: new Date().toISOString(),
    locationId: "",
    currency: "USD",
    items: [],
    hours: { byWeekday: {}, timezone: "America/Los_Angeles" },
    discounts: [],
    pricingRules: [],
    productSets: [],
  };
}

async function loadSnapshot(): Promise<MenuSnapshot> {
  try {
    const [{ items, discounts, pricingRules, productSets }, hours] =
      await Promise.all([cachedCatalog(), cachedHours()]);
    return {
      fetchedAt: new Date().toISOString(),
      locationId: squareLocationId(),
      currency: "USD",
      items,
      hours,
      discounts,
      pricingRules,
      productSets,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Square snapshot unavailable; rendering with empty snapshot.", err);
      return emptySnapshot();
    }
    throw err;
  }
}

export default async function Home() {
  const [snapshot, reviews] = await Promise.all([loadSnapshot(), getReviews()]);

  return (
    <OrderProvider initialSnapshot={snapshot}>
      <ScrollAnimator />
      <Navbar />
      <main>
        <Hero />
        <Heritage />
        <Process />
        <Menu />
        <Testimonials reviews={reviews} />
        <Contact />
        <Location />
      </main>
      <Footer />
      <FloatingOrderCTA />
      <OrderFlowMount />
    </OrderProvider>
  );
}
