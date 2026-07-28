"use client";

import { useEffect, useState } from "react";

const BETA_DATE = new Date("2026-08-28T18:00:00-03:00").getTime();

type CountdownValues = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getCountdown(now: number): CountdownValues | null {
  const distance = BETA_DATE - now;

  if (distance <= 0) return null;

  return {
    days: Math.floor(distance / 86_400_000),
    hours: Math.floor((distance / 3_600_000) % 24),
    minutes: Math.floor((distance / 60_000) % 60),
    seconds: Math.floor((distance / 1_000) % 60),
  };
}

const units: Array<{ key: keyof CountdownValues; label: string }> = [
  { key: "days", label: "Días" },
  { key: "hours", label: "Horas" },
  { key: "minutes", label: "Minutos" },
  { key: "seconds", label: "Segundos" },
];

export function Countdown() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    updateNow();
    const interval = window.setInterval(updateNow, 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const values = now === null ? undefined : getCountdown(now);

  if (values === null) {
    return <p className="text-lg text-[#d2f58a]">La beta privada de PAMPA ya comenzó.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-live="polite">
      {units.map(({ key, label }) => (
        <div key={key} className="border border-white/10 bg-[#11140f] px-3 py-4 text-center sm:px-5">
          <p className="font-mono text-3xl tracking-[-0.08em] text-[#f2f1e8] sm:text-4xl" aria-label={`${values?.[key] ?? "cargando"} ${label.toLowerCase()}`}>
            {values?.[key].toString().padStart(2, "0") ?? "--"}
          </p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#a7aa9d]">{label}</p>
        </div>
      ))}
    </div>
  );
}
