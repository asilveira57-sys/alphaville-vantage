import { useEffect, useState } from "react";

/**
 * Campo de valor no padrão brasileiro (R$ 1.234.567.890,12).
 * Aceita até 9 dígitos inteiros + 2 casas decimais.
 * O valor exposto via onChange é numérico (ou null quando vazio).
 */

const MAX_INT_DIGITS = 9;

export function formatBRL(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Converte o texto digitado em número, aceitando "1.234,56" e "1234.56". */
export function parseBRL(text: string): number | null {
  const cleaned = text.replace(/[^\d.,-]/g, "");
  if (!cleaned.trim()) return null;
  let normalized = cleaned;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if ((cleaned.match(/\./g)?.length ?? 0) > 1) {
    normalized = cleaned.replace(/\./g, "");
  }
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  const [int] = Math.abs(n).toFixed(2).split(".");
  if ((int?.length ?? 0) > MAX_INT_DIGITS) return null;
  return Math.round(n * 100) / 100;
}

type Props = {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  prefix?: string;
};

export function MoneyInput({
  value,
  onChange,
  className,
  placeholder = "0,00",
  id,
  disabled,
  prefix = "R$",
}: Props) {
  const [text, setText] = useState(() => formatBRL(value ?? null));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatBRL(value ?? null));
  }, [value, focused]);

  const handleChange = (raw: string) => {
    // mantém apenas dígitos, vírgula, ponto e sinal
    let next = raw.replace(/[^\d.,-]/g, "");
    // no máximo uma vírgula decimal
    const parts = next.split(",");
    if (parts.length > 2) next = `${parts[0]},${parts.slice(1).join("")}`;
    // limita casas decimais a 2
    const [intPart = "", decPart] = next.split(",");
    const digits = intPart.replace(/\D/g, "");
    if (digits.length > MAX_INT_DIGITS) return;
    const limited = decPart != null ? `${intPart},${decPart.replace(/\D/g, "").slice(0, 2)}` : intPart;
    setText(limited);
    onChange(parseBRL(limited));
  };

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      {prefix && <span className="text-muted-foreground text-[11px] shrink-0">{prefix}</span>}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        placeholder={placeholder}
        value={text}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          const n = parseBRL(text);
          setText(formatBRL(n));
          onChange(n);
        }}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full bg-transparent outline-none"
      />
    </div>
  );
}
