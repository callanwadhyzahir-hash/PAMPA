import { MotionConfig } from "framer-motion";

import { BarcodeFlow } from "@/components/landing/barcode-flow";
import { Capabilities } from "@/components/landing/capabilities";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { InventoryFlow } from "@/components/landing/inventory-flow";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { MacbookShowcase } from "@/components/landing/macbook-showcase";

export default function Home() {
  return (
    <MotionConfig reducedMotion="user">
      <main id="inicio" className="min-h-screen w-full bg-void-black">
        <LandingHeader />
        <Hero />
        <MacbookShowcase />
        <Capabilities />
        <BarcodeFlow />
        <InventoryFlow />
        <FinalCta />
        <LandingFooter />
      </main>
    </MotionConfig>
  );
}
