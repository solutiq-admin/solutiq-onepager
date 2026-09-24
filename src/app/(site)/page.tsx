import { Nav } from "@/components/onepager/Nav";
import Hero from "@/components/onepager/Hero";
import WhatWeAre from "@/components/onepager/WhatWeAre";
import PracticesGrid from "@/components/onepager/PracticesGrid";
import WhoWeWorkWith from "@/components/onepager/WhoWeWorkWith";
import ClosingCta from "@/components/onepager/ClosingCta";
import ContactForm from "@/components/onepager/ContactForm";
import Footer from "@/components/onepager/Footer";

export default function Page() {
  return (
    <main>
      <Nav />
      <Hero />
      <WhatWeAre />
      <PracticesGrid />
      <WhoWeWorkWith />
      {/* <ClosingCta /> */}
      <ContactForm />
      <Footer />
    </main>
  );
}