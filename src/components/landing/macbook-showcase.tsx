import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { SignalPulseBackground } from "@/components/landing/signal-pulse-background";
import { MacbookScroll } from "@/components/ui/macbook-scroll";

export function MacbookShowcase() {
  return (
    <section className="relative overflow-hidden border-b border-phosphor-blue-black bg-void-black">
      <SignalPulseBackground />
      <div className="relative z-10">
        <MacbookScroll
          showGradient={false}
          title={
            <span>
              Todo tu negocio, <span className="text-lime-pulse">en una pantalla</span>.
            </span>
          }
        >
          <DashboardPreview />
        </MacbookScroll>
      </div>
    </section>
  );
}
