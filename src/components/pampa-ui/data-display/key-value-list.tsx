type KeyValueItem = {
  label: string;
  value: string;
};

type KeyValueListProps = {
  items: KeyValueItem[];
};

function KeyValueList({ items }: KeyValueListProps) {
  return (
    <dl className="divide-y rounded-lg border">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="font-medium text-right">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export { KeyValueList };
export type { KeyValueItem, KeyValueListProps };
