type Props = { current: number; total: number };

export function RadarProgress({ current, total }: Props) {
  const pct = Math.min(100, Math.round((current / Math.max(total, 1)) * 100));
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[#1A1A1A]/60">
        <span>
          Etapa {current} de {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div
        className="mt-2 h-1 w-full bg-black/10"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso do Radar"
      >
        <div className="h-full bg-[#F2DA00] transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
