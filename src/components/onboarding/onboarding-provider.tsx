"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { onboardingRegistry, type Tour, type TourStep } from "./onboarding-registry";
import { useOnboardingStorage } from "./onboarding-storage";
import "./tours/getting-started";

interface OnboardingContextValue {
  tours: Tour[];
  activeTour: Tour | null;
  currentStep: TourStep | null;
  stepIndex: number;
  stepCount: number;
  statusFor: (tourId: string) => "not_started" | "in_progress" | "completed" | "skipped";
  startTour: (tourId: string) => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  /** Lets the sidebar's Sheet be opened programmatically when a step's target lives inside it. */
  registerMobileNavOpener: (fn: ((open: boolean) => void) | null) => void;
  openMobileNav: (open: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function visibleSteps(tour: Tour, permissions: string[]): TourStep[] {
  return tour.steps.filter((step) => !step.permission || permissions.includes(step.permission));
}

export function OnboardingProvider({
  userId,
  permissions,
  children,
}: {
  userId: string | null;
  permissions: string[];
  children: ReactNode;
}) {
  const { progressByTour, loaded, updateProgress } = useOnboardingStorage(userId);
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const mobileNavOpener = useRef<((open: boolean) => void) | null>(null);
  const autoStarted = useRef(false);

  const tours = useMemo(() => Object.values(onboardingRegistry), []);

  const statusFor = useCallback(
    (tourId: string) => progressByTour[tourId]?.status ?? "not_started",
    [progressByTour],
  );

  const startTour = useCallback(
    (tourId: string) => {
      if (!onboardingRegistry[tourId]) return;
      setActiveTourId(tourId);
      setStepIndex(0);
      updateProgress(tourId, "in_progress", 0);
    },
    [updateProgress],
  );

  const activeTour = activeTourId ? (onboardingRegistry[activeTourId] ?? null) : null;
  const steps = activeTour ? visibleSteps(activeTour, permissions) : [];
  const currentStep = steps[stepIndex] ?? null;

  const endTour = useCallback(
    (status: "completed" | "skipped") => {
      if (activeTourId) updateProgress(activeTourId, status, stepIndex);
      setActiveTourId(null);
      setStepIndex(0);
    },
    [activeTourId, stepIndex, updateProgress],
  );

  const next = useCallback(() => {
    if (!activeTourId) return;
    if (stepIndex + 1 >= steps.length) {
      endTour("completed");
      return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    updateProgress(activeTourId, "in_progress", nextIndex);
  }, [activeTourId, steps.length, stepIndex, updateProgress, endTour]);

  const prev = useCallback(() => {
    setStepIndex((index) => Math.max(0, index - 1));
  }, []);

  const skip = useCallback(() => endTour("skipped"), [endTour]);

  const registerMobileNavOpener = useCallback((fn: ((open: boolean) => void) | null) => {
    mobileNavOpener.current = fn;
  }, []);

  const openMobileNav = useCallback((open: boolean) => {
    mobileNavOpener.current?.(open);
  }, []);

  useEffect(() => {
    if (!loaded || autoStarted.current) return;
    autoStarted.current = true;
    // A missing record means this user has never seen "getting-started" — auto-start it once
    // progress has loaded. Once it's completed or skipped, never force it again (existing
    // users don't get re-onboarded invasively just because a new PAMPA version shipped).
    if (!progressByTour["getting-started"]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startTour("getting-started");
    }
  }, [loaded, progressByTour, startTour]);

  const value: OnboardingContextValue = {
    tours,
    activeTour,
    currentStep,
    stepIndex,
    stepCount: steps.length,
    statusFor,
    startTour,
    next,
    prev,
    skip,
    registerMobileNavOpener,
    openMobileNav,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error("useOnboarding must be used within OnboardingProvider");
  return context;
}
