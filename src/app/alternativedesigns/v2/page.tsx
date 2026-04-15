import Navbar from "@/components/v2/Navbar";
import Hero from "@/components/v2/Hero";
import Heritage from "@/components/v2/Heritage";
import Process from "@/components/v2/Process";
import Menu from "@/components/v2/Menu";
import Testimonials from "@/components/v2/Testimonials";
import Contact from "@/components/v2/Contact";
import Location from "@/components/v2/Location";
import Footer from "@/components/v2/Footer";
import ScrollAnimator from "@/components/ScrollAnimator";

export default function Home() {
  return (
    <>
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
    </>
  );
}
