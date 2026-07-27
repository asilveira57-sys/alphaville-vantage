import { useId } from "react";
import type { RadarAnswers, RadarQuestion } from "@/lib/radar-config";
import { maskCurrency } from "./radar-utils";

type Props = {
  question: RadarQuestion;
  answers: RadarAnswers;
  onChange: (id: string, value: string | string[]) => void;
  error?: string | null;
};

export function RadarQuestionField({ question, answers, onChange, error }: Props) {
  const errorId = useId();
  const raw = answers[question.id];
  const selected = Array.isArray(raw) ? raw : raw ? [raw] : [];

  const toggleMulti = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt];
    onChange(question.id, next);
  };

  return (
    <fieldset className="min-w-0">
      <legend className="font-display text-2xl md:text-3xl font-medium text-[#0D0D0D] text-balance">
        {question.label}
      </legend>
      {question.help ? <p className="mt-2 text-sm text-[#1A1A1A]/60">{question.help}</p> : null}
      {question.type === "multi" ? (
        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#1A1A1A]/45">
          Pode escolher mais de uma
        </p>
      ) : null}

      <div className="mt-6">
        {question.type === "single" || question.type === "multi" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(question.options ?? []).map((opt) => {
              const active = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  role={question.type === "multi" ? "checkbox" : "radio"}
                  aria-checked={active}
                  onClick={() => (question.type === "multi" ? toggleMulti(opt) : onChange(question.id, opt))}
                  className={`rounded-lg border px-4 py-3 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2DA00] ${
                    active
                      ? "border-[#0D0D0D] bg-[#0D0D0D] text-white"
                      : "border-black/10 bg-white text-[#0D0D0D] hover:border-[#0D0D0D]/40"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <input
            type="text"
            inputMode={question.type === "currency" ? "numeric" : "text"}
            value={(raw as string) ?? ""}
            placeholder={question.placeholder}
            aria-label={question.label}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) =>
              onChange(question.id, question.type === "currency" ? maskCurrency(e.target.value) : e.target.value)
            }
            className="w-full rounded-lg border border-black/15 bg-white px-4 py-3 text-sm outline-none focus:border-[#0D0D0D] focus-visible:ring-2 focus-visible:ring-[#F2DA00]"
          />
        )}

        {question.allowNote ? (
          <textarea
            rows={3}
            placeholder="Observação (opcional)"
            aria-label="Observação"
            value={(answers[`${question.id}_note`] as string) ?? ""}
            onChange={(e) => onChange(`${question.id}_note`, e.target.value)}
            className="mt-3 w-full rounded-lg border border-black/15 bg-white px-4 py-3 text-sm outline-none focus:border-[#0D0D0D] focus-visible:ring-2 focus-visible:ring-[#F2DA00]"
          />
        ) : null}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
