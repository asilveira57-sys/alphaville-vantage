type Item = { label: string; value?: string | null };

export function RadarSummary({ items }: { items: Item[] }) {
  const filled = items.filter((i) => i.value);
  if (!filled.length) return null;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-left">
      {filled.map((i) => (
        <div key={i.label}>
          <dt className="text-[10px] uppercase tracking-[0.22em] text-[#1A1A1A]/50">{i.label}</dt>
          <dd className="mt-1 text-sm text-[#0D0D0D]">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
