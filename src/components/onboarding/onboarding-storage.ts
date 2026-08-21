"use client";

import { useCallback, useEffect, useState } from "react";

import { onboardingService, type OnboardingProgress, type OnboardingStatus } from "@/services/onboarding.service";
import { ONBOARDING_VERSION } from "./onboarding-registry";

export function useOnboardingStorage(userId: string | null) {
  const [progressByTour, setProgressByTour] = useState<Record<string, OnboardingProgress>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    onboardingService
      .listProgress()
      .then((list) => {
        if (!active) return;
        const map: Record<string, OnboardingProgress> = {};
        for (const entry of list) map[entry.tour_id] = entry;
        setProgressByTour(map);
      })
      .catch(() => {
        // Progress is a convenience layer, not a gate — a load failure just means
        // the tour behaves as if it were never started.
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const updateProgress = useCallback(
    (tourId: string, status: OnboardingStatus, currentStep: number) => {
      setProgressByTour((prev) => ({
        ...prev,
        [tourId]: { tour_id: tourId, status, current_step: currentStep, onboarding_version: ONBOARDING_VERSION },
      }));
      onboardingService
        .updateProgress(tourId, { status, currentStep, onboardingVersion: ONBOARDING_VERSION })
        .catch(() => {
          // Best-effort persistence: the tour already advanced locally.
        });
    },
    [],
  );

  return { progressByTour, loaded, updateProgress };
}
