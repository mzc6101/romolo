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
import { getCatalog } from "@/lib/square/catalog";
import { getOpenPeriods } from "@/lib/square/hours";
import { squareLocationId } from "@/lib/square/client";
import type { MenuSnapshot } from "@/lib/square/types";

// Render at request time so the build never calls Square (Railway injects
// SQUARE_* env vars at runtime, not during `next build`). The 15-min cache
// lives on the data calls below via unstable_cache.
export const dynamic = "force-dynamic";

const CACHE_SECONDS = 900;

const cachedCatalog = unstable_cache(
  async () => getCatalog(),
  ["square-catalog"],
  { revalidate: CACHE_SECONDS },
);

const cachedHours = unstable_cache(
  async () => getOpenPeriods(),
  ["square-hours"],
  { revalidate: CACHE_SECONDS },
);

async function loadSnapshot(): Promise<MenuSnapshot> {
  const [{ items }, hours] = await Promise.all([
    cachedCatalog(),
    cachedHours(),
  ]);
  return {
    fetchedAt: new Date().toISOString(),
    locationId: squareLocationId(),
    currency: "USD",
    items,
    hours,
  };
}

export default async function Home() {
  const snapshot = await loadSnapshot();

  return (
    <OrderProvider initialSnapshot={snapshot}>
      <ScrollAnimator />
      <Navbar />
      <main>
        <Hero />
        <Heritage />
        <Process />
        <Menu />
        <Testimonials />
        <Contact />
        <Location />
      </main>
      <Footer />
      <OrderFlowMount />
    </OrderProvider>
  );
}
