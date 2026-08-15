function roundedTopBarPath(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  return `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`;
}

export function DailyBarChart({
  points,
  colorClassName = "fill-primary",
}: {
  points: { date: string; value: number }[];
  colorClassName?: string;
}) {
  const chartHeight = 64;
  const max = Math.max(1, ...points.map((point) => point.value));
  const barWidth = points.length > 0 ? 100 / points.length : 0;
  const gap = Math.min(barWidth * 0.25, 0.6);

  return (
    <svg
      viewBox={`0 0 100 ${chartHeight}`}
      preserveAspectRatio="none"
      className="h-16 w-full overflow-visible"
      role="img"
      aria-label={`Serie diaria: ${points.map((p) => `${p.date} ${p.value}`).join(", ")}`}
    >
      {points.map((point, index) => {
        const x = index * barWidth + gap / 2;
        const width = Math.max(barWidth - gap, 0.4);
        if (point.value === 0) {
          return (
            <rect key={point.date} x={x} y={chartHeight - 1.5} width={width} height={1.5} className="fill-border">
              <title>{`${formatShortDate(point.date)}: 0`}</title>
            </rect>
          );
        }
        const barHeight = Math.max((point.value / max) * (chartHeight - 6), 3);
        return (
          <path
            key={point.date}
            d={roundedTopBarPath(x, chartHeight - barHeight, width, barHeight, 1.4)}
            className={colorClassName}
          >
            <title>{`${formatShortDate(point.date)}: ${point.value}`}</title>
          </path>
        );
      })}
    </svg>
  );
}

function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  });
}
