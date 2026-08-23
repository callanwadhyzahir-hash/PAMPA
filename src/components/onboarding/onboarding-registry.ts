import type { Placement } from "@floating-ui/react";

export interface TourStep {
  /** Unique within the tour. */
  id: string;
  /** Matches a `data-tour="<target>"` element in the DOM. Omit for a centered, un-anchored step (e.g. a welcome card). */
  target?: string;
  /** Route the step's target lives on. If different from the current route, the engine navigates there first. */
  route?: string;
  title: string;
  description: string;
  placement?: Placement;
  /** Permission required to show this step. Steps the user can't act on are skipped, not shown broken. */
  permission?: string;
  /** Optional contextual CTA replacing the default "Siguiente" label. Always advances the tour after navigating. */
  primaryAction?: { label: string; href: string };
}

export interface Tour {
  id: string;
  title: string;
  /** Permission required to see any step of this tour at all. */
  permission?: string;
  /** Route that auto-starts this tour the first time a user lands on it (if never seen and no other tour is active). */
  autoStartRoute?: string;
  steps: TourStep[];
}

export const onboardingRegistry: Record<string, Tour> = {};

export function registerTour(tour: Tour) {
  onboardingRegistry[tour.id] = tour;
}

export const ONBOARDING_VERSION = 1;
