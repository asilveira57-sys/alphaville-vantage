import { RADAR_INTERESTS } from "@/lib/radar-config";

type Props = {
  value?: string;
  onSelect: (value: string) => void;
};

export function InterestCards({ value, onSelect }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Qual é seu principal objetivo?"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
    >
      {RADAR_INTERESTS.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(item.value)}
            className={`text-left rounded-xl border p-4 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2DA00] ${
              active
                ? "border-[#0D0D0D] bg-[#0D0D0D] text-white"
                : "border-black/10 bg-white hover:border-[#0D0D0D]/40"
            }`}
          >
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] leading-snug">
              {item.title}
            </span>
            <span className={`mt-2 block text-sm leading-relaxed ${active ? "text-white/70" : "text-[#1A1A1A]/65"}`}>
              {item.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
