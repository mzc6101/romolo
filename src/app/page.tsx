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

export const revalidate = 900;

async function loadSnapshot(): Promise<MenuSnapshot> {
  const [{ items }, hours] = await Promise.all([
    getCatalog(),
    getOpenPeriods(),
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
