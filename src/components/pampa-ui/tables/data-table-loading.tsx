function DataTableLoading({ columnCount = 4 }: { columnCount?: number }) {
  return (
    <div className="space-y-3 p-4" aria-label="Cargando tabla" role="status">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columnCount }, (_, cellIndex) => (
            <div key={cellIndex} className="h-7 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ))}
      <span className="sr-only">Cargando tabla</span>
    </div>
  );
}

export { DataTableLoading };
