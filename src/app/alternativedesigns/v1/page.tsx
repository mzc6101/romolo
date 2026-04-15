import Navbar from "@/components/v1/Navbar";
import Hero from "@/components/v1/Hero";
import Heritage from "@/components/v1/Heritage";
import Process from "@/components/v1/Process";
import Menu from "@/components/v1/Menu";
import Testimonials from "@/components/v1/Testimonials";
import Contact from "@/components/v1/Contact";
import Location from "@/components/v1/Location";
import Footer from "@/components/v1/Footer";
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
