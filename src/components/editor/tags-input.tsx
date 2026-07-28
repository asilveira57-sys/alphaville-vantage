import { useState, type KeyboardEvent, type ClipboardEvent } from "react";

type Props = {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  id?: string;
};

/**
 * Chip based tag editor.
 * - Comma or Enter commits the current term (accents and symbols preserved)
 * - Backspace on empty input removes the last chip
 * - Pasting a comma / newline separated list creates several chips at once
 */
export function TagsInput({ value, onChange, placeholder, id }: Props) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const parts = raw
      .split(/[,\n;]+/)
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) {
      if (!next.some((t) => t.localeCompare(p, "pt-BR", { sensitivity: "base" }) === 0)) {
        next.push(p);
      }
    }
    onChange(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "," || e.key === "Enter" || e.key === "Tab") {
      if (draft.trim()) {
        e.preventDefault();
        commit(draft);
        setDraft("");
      } else if (e.key === ",") {
        e.preventDefault();
      }
      return;
    }
    if (e.key === "Backspace" && !draft && value.length) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (/[,\n;]/.test(text)) {
      e.preventDefault();
      commit(text);
      setDraft("");
    }
  };

  return (
    <div className="w-full border border-ink/15 px-2 py-1.5 focus-within:border-ink flex flex-wrap gap-1.5 items-center">
      {value.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center gap-1 bg-ink/8 border border-ink/10 px-2 py-1 text-xs text-ink"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remover ${tag}`}
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            className="text-muted-foreground hover:text-ink leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onBlur={() => {
          if (draft.trim()) {
            commit(draft);
            setDraft("");
          }
        }}
        placeholder={value.length ? "" : placeholder}
        className="flex-1 min-w-[120px] px-1 py-1 text-sm bg-transparent focus:outline-none"
      />
    </div>
  );
}
