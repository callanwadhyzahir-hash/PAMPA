"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Compass, X } from "lucide-react";
import {
  arrow,
  autoUpdate,
  flip,
  FloatingArrow,
  offset,
  shift,
  useFloating,
  type Placement,
} from "@floating-ui/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingTooltipProps {
  anchorElement: HTMLElement | null;
  placement?: Placement;
  title: string;
  description: string;
  stepIndex: number;
  stepCount: number;
  isLast: boolean;
  canGoBack: boolean;
  primaryAction?: { label: string; href: string };
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

function TourCardBody({
  title,
  description,
  stepIndex,
  stepCount,
  isLast,
  canGoBack,
  primaryAction,
  onNext,
  onPrev,
  onSkip,
}: Omit<OnboardingTooltipProps, "anchorElement" | "placement">) {
  return (
    <>
      <div className="flex justify-between">
        <span className="grid size-11 place-items-center rounded-sm bg-primary/15 text-primary">
          <Compass className="size-5" />
        </span>
        <button onClick={onSkip} className="p-2 text-muted-foreground" aria-label="Cerrar tutorial">
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-6 text-caption uppercase tracking-wider text-muted-foreground">
        {stepIndex + 1} de {stepCount}
      </p>
      <h2 className="mt-2 font-display text-heading-sm font-medium text-foreground">{title}</h2>
      <p className="mt-3 text-body-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-7 h-1.5 rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${((stepIndex + 1) / stepCount) * 100}%` }}
        />
      </div>
      <div className="mt-6 flex justify-between gap-3">
        <Button variant="ghost" onClick={onSkip}>
          Omitir
        </Button>
        <div className="flex gap-2">
          {canGoBack ? (
            <Button variant="outline" onClick={onPrev}>
              Anterior
            </Button>
          ) : null}
          {primaryAction ? (
            <Button render={<Link href={primaryAction.href} />} onClick={onNext}>
              {primaryAction.label}
            </Button>
          ) : (
            <Button onClick={onNext} className="gap-1.5">
              {isLast ? "Finalizar" : "Siguiente"}
              {isLast ? null : <ArrowRight className="size-4" />}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

export function OnboardingTooltip(props: OnboardingTooltipProps) {
  const { anchorElement, placement = "bottom", onSkip } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, [props.stepIndex]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onSkip();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onSkip]);

  const { refs, floatingStyles, context } = useFloating({
    placement,
    open: true,
    whileElementsMounted: autoUpdate,
    // floating-ui's arrow middleware reads `element.current` lazily when computing position,
    // not during render — this is its documented API for anchoring an arrow to a ref.
    // eslint-disable-next-line react-hooks/refs
    middleware: [offset(14), flip({ padding: 12 }), shift({ padding: 12 }), arrow({ element: arrowRef })],
  });

  useEffect(() => {
    refs.setReference(anchorElement);
  }, [anchorElement, refs]);

  if (!anchorElement) {
    return (
      <div className="fixed inset-0 z-[101] grid place-items-center p-4">
        <div
          ref={containerRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          className="w-full max-w-md rounded-lg border border-border bg-popover p-7 text-popover-foreground outline-none"
        >
          <TourCardBody {...props} />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={(node) => {
        refs.setFloating(node);
        containerRef.current = node;
      }}
      style={floatingStyles}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      className={cn(
        "z-[101] w-full max-w-sm rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-lg outline-none",
      )}
    >
      <FloatingArrow ref={arrowRef} context={context} className="fill-popover" />
      <TourCardBody {...props} />
    </div>
  );
}
