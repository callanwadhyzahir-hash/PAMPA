"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useOnboarding } from "./onboarding-provider";
import { OnboardingOverlay } from "./onboarding-overlay";
import { OnboardingTooltip } from "./onboarding-tooltip";

/** Waits for a `[data-tour="<targetId>"]` element to exist, retrying via MutationObserver instead of a fixed timeout. */
function useTourTarget(targetId: string | undefined, routeReady: boolean) {
  const [element, setElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!targetId || !routeReady) {
      // Resets the mirrored DOM-query result when the step (external target) changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElement(null);
      return;
    }
    // Desktop and mobile render separate DOM trees for the same nav (one hidden via CSS
    // depending on viewport), so more than one element can share a data-tour value —
    // pick the one that's actually visible.
    const find = () => {
      const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${targetId}"]`);
      for (const candidate of candidates) {
        if (candidate.getClientRects().length > 0) return candidate;
      }
      return null;
    };
    const existing = find();
    if (existing) {
      setElement(existing);
      return;
    }
    const observer = new MutationObserver(() => {
      const found = find();
      if (found) {
        setElement(found);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [targetId, routeReady]);

  return element;
}

function useTargetRect(element: HTMLElement | null) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!element) {
      // Resets the mirrored rect when the observed element (external target) changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRect(null);
      return;
    }
    const update = () => setRect(element.getBoundingClientRect());
    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(element);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [element]);

  return rect;
}

export function OnboardingEngine() {
  const { activeTour, currentStep, stepIndex, stepCount, next, prev, skip, openMobileNav } = useOnboarding();
  const router = useRouter();
  const pathname = usePathname();

  const routeReady = !currentStep?.route || currentStep.route === pathname;

  useEffect(() => {
    if (currentStep?.route && currentStep.route !== pathname) {
      router.push(currentStep.route);
    }
  }, [currentStep?.route, pathname, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    if (!isMobile) return;
    openMobileNav(currentStep?.target === "sidebar-root");
  }, [currentStep?.target, openMobileNav]);

  const targetElement = useTourTarget(currentStep?.target, routeReady);
  const targetRect = useTargetRect(targetElement);

  useEffect(() => {
    if (!targetElement) return;
    targetElement.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
  }, [targetElement]);

  if (!activeTour || !currentStep || !routeReady) return null;
  // A step with a target waits for it to appear rather than falling back to a centered card.
  if (currentStep.target && !targetElement) return null;

  return (
    <>
      <OnboardingOverlay targetRect={currentStep.target ? targetRect : null} onDismiss={skip} />
      <OnboardingTooltip
        anchorElement={currentStep.target ? targetElement : null}
        placement={currentStep.placement}
        title={currentStep.title}
        description={currentStep.description}
        stepIndex={stepIndex}
        stepCount={stepCount}
        isLast={stepIndex + 1 >= stepCount}
        canGoBack={stepIndex > 0}
        primaryAction={currentStep.primaryAction}
        onNext={next}
        onPrev={prev}
        onSkip={skip}
      />
    </>
  );
}
