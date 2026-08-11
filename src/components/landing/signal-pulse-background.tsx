const LINE_POSITIONS = [6, 18, 30, 42, 54, 66, 78, 90];

export function SignalPulseBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {LINE_POSITIONS.map((left, index) => (
        <span
          key={left}
          className="absolute inset-y-0 w-px animate-signal-pulse bg-circuit-border"
          style={{ left: `${left}%`, animationDelay: `${index * 0.6}s` }}
        />
      ))}
    </div>
  );
}
