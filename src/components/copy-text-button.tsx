import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Botão de copiar com aviso "Copiado" por 2 segundos. */
export function CopyTextButton({ text, label, ariaLabel, className = "" }: { text: string; label?: string; ariaLabel: string; className?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement("textarea");
      t.value = text; document.body.appendChild(t); t.select();
      document.execCommand("copy"); t.remove();
    }
    setDone(true);
    window.setTimeout(() => setDone(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ink transition ${className}`}
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {done ? "Copiado" : label}
      <span role="status" className="sr-only">{done ? "Copiado" : ""}</span>
    </button>
  );
}
