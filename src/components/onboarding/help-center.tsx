"use client";

import { Check, Circle, CircleDot } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useOnboarding } from "./onboarding-provider";

export interface HelpCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatusIcon({ status }: { status: "not_started" | "in_progress" | "completed" | "skipped" }) {
  if (status === "completed") return <Check className="size-4 text-primary" aria-hidden />;
  if (status === "in_progress") return <CircleDot className="size-4 text-primary" aria-hidden />;
  return <Circle className="size-4 text-muted-foreground" aria-hidden />;
}

const statusLabel: Record<string, string> = {
  not_started: "No iniciado",
  in_progress: "En progreso",
  completed: "Completado",
  skipped: "Omitido",
};

export function HelpCenter({ open, onOpenChange }: HelpCenterProps) {
  const { tours, statusFor, startTour } = useOnboarding();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Aprender PAMPA</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-1 px-1">
          {tours.map((tour) => {
            const status = statusFor(tour.id);
            return (
              <div
                key={tour.id}
                className="flex items-center justify-between gap-3 rounded-sm px-3 py-3 hover:bg-secondary"
              >
                <div className="flex items-center gap-3">
                  <StatusIcon status={status} />
                  <div>
                    <p className="text-body-sm font-medium text-foreground">{tour.title}</p>
                    <p className="text-caption text-muted-foreground">{statusLabel[status]}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    startTour(tour.id);
                  }}
                >
                  {status === "not_started" ? "Empezar" : "Repasar"}
                </Button>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
