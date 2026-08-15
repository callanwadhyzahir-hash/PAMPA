"use client";

import { Braces } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ACTIVITY_RESULT_LABELS,
  activityEventLabel,
} from "@/services/platform-admin/activity-labels";
import type { PlatformActivityEvent } from "@/services/platform-admin/platform-admin.service";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actorLabel(actor: PlatformActivityEvent["actor"]) {
  if (!actor) return "Sistema";
  return `${actor.firstName} ${actor.lastName}`;
}

function resultBadgeVariant(result: PlatformActivityEvent["result"]) {
  if (result === "SUCCESS") return "success" as const;
  if (result === "BLOCKED") return "warning" as const;
  return "danger" as const;
}

export function ActivityTable({
  events,
  emptyMessage = "Sin eventos.",
  showCompany = true,
  showTarget = true,
  onInspect,
}: {
  events: PlatformActivityEvent[];
  emptyMessage?: string;
  showCompany?: boolean;
  showTarget?: boolean;
  onInspect?: (event: PlatformActivityEvent) => void;
}) {
  if (events.length === 0) {
    return <p className="py-4 text-body-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Evento</TableHead>
          <TableHead>Actor</TableHead>
          {showTarget ? <TableHead>Objetivo</TableHead> : null}
          {showCompany ? <TableHead>Empresa</TableHead> : null}
          <TableHead>Resultado</TableHead>
          {onInspect ? <TableHead className="sr-only">Detalle</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id}>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {formatDateTime(event.createdAt)}
            </TableCell>
            <TableCell className="font-medium">{activityEventLabel(event.eventType)}</TableCell>
            <TableCell>{actorLabel(event.actor)}</TableCell>
            {showTarget ? (
              <TableCell className="text-muted-foreground">
                {event.target ? `${event.target.firstName} ${event.target.lastName}` : "—"}
              </TableCell>
            ) : null}
            {showCompany ? (
              <TableCell className="text-muted-foreground">{event.company?.name ?? "—"}</TableCell>
            ) : null}
            <TableCell>
              <Badge variant={resultBadgeVariant(event.result)}>
                {ACTIVITY_RESULT_LABELS[event.result] ?? event.result}
              </Badge>
            </TableCell>
            {onInspect ? (
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Ver detalle del evento"
                  onClick={() => onInspect(event)}
                >
                  <Braces className="size-4" aria-hidden />
                </Button>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
