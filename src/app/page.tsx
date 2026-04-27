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

export default function Home() {
  return (
    <OrderProvider>
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
