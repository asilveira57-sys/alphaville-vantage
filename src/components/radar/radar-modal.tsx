import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, X } from "lucide-react";
import {
  interestLabel,
  visibleQuestions,
  type RadarAnswers,
} from "@/lib/radar-config";
import { submitRadarLead } from "@/lib/radar.functions";
import { radarToPropertySearch } from "@/lib/radar-to-filters";

import { InterestCards } from "./interest-cards";
import { RadarProgress } from "./radar-progress";
import { RadarQuestionField } from "./radar-question";
import { RadarContactForm, EMPTY_CONTACT, type RadarContactState } from "./radar-contact-form";
import { RadarSuccess } from "./radar-success";
import { isValidEmail, readTracking, trackRadar, RADAR_STORAGE_KEY } from "./radar-utils";

type Props = { open: boolean; onClose: () => void };

type Status = "idle" | "saving" | "success" | "error";

const BUDGET_KEYS = ["purchase_budget", "monthly_housing_budget", "investment_capital", "available_down_payment", "land_budget", "house_purchase_budget", "relocation_budget", "relocation_rent_budget", "decision_value_range", "maximum_opportunity_value", "expected_sale_price", "expected_monthly_rent"];
const REGION_KEYS = ["preferred_regions", "rental_regions", "investment_regions", "development_regions", "current_region", "target_location", "seller_property_location", "landlord_property_location"];
const TIMELINE_KEYS = ["move_timeline", "rental_start_date", "land_purchase_timeline", "house_move_timeline", "sale_timeline", "property_available_date", "opportunity_urgency", "decision_timeline", "delivery_timeline", "idle_duration"];

function pick(answers: RadarAnswers, keys: string[]): string | null {
  for (const k of keys) {
    const v = answers[k];
    const s = Array.isArray(v) ? v.join(", ") : v;
    if (s && String(s).trim()) return String(s);
  }
  return null;
}

export function RadarModal({ open, onClose }: Props) {
  const submitFn = useServerFn(submitRadarLead);
  const [interest, setInterest] = useState<string>("");
  const [answers, setAnswers] = useState<RadarAnswers>({});
  const [contact, setContact] = useState<RadarContactState>(EMPTY_CONTACT);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [contactErrors, setContactErrors] = useState<Partial<Record<keyof RadarContactState, string>>>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);

  const questions = useMemo(() => (interest ? visibleQuestions(interest, answers) : []), [interest, answers]);
  const totalSteps = questions.length + 2; // objetivo + perguntas + contato
  const currentQuestion = step > 0 && step <= questions.length ? questions[step - 1] : null;
  const isContactStep = step === questions.length + 1 && !!interest;

  // Recupera progresso local (sem dados pessoais).
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(RADAR_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { interest?: string; answers?: RadarAnswers; step?: number };
        if (saved.interest) {
          setInterest(saved.interest);
          setAnswers(saved.answers ?? {});
          setStep(Math.max(0, saved.step ?? 0));
        }
      }
    } catch {
      /* ignora progresso corrompido */
    }
  }, [open]);

  useEffect(() => {
    if (!open || typeof window === "undefined" || status === "success") return;
    try {
      window.localStorage.setItem(RADAR_STORAGE_KEY, JSON.stringify({ interest, answers, step }));
    } catch {
      /* storage indisponível */
    }
  }, [open, interest, answers, step, status]);

  const handleClose = useCallback(() => {
    if (status !== "success" && !completedRef.current && interest) {
      trackRadar("radar_abandoned", { interest_type: interest, step });
    }
    onClose();
  }, [onClose, status, interest, step]);

  useEffect(() => {
    if (!open) return;
    trackRadar("radar_started", { ...readTracking(), step: 0 });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const setAnswer = (id: string, value: string | string[]) => {
    setFieldError(null);
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const goNext = () => {
    if (step === 0) {
      if (!interest) {
        setFieldError("Escolha um objetivo para continuar.");
        return;
      }
      trackRadar("radar_interest_selected", { interest_type: interest });
      setStep(1);
      return;
    }
    if (currentQuestion) {
      const v = answers[currentQuestion.id];
      const empty = Array.isArray(v) ? v.length === 0 : !v || !String(v).trim();
      if (currentQuestion.required && empty) {
        setFieldError("Selecione uma opção para continuar.");
        return;
      }
      trackRadar("radar_step_completed", { interest_type: interest, step, field: currentQuestion.id });
      const next = step + 1;
      setStep(next);
      if (next === questions.length + 1) trackRadar("radar_contact_started", { interest_type: interest });
    }
  };

  const goBack = () => {
    setFieldError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const validateContact = () => {
    const errs: Partial<Record<keyof RadarContactState, string>> = {};
    if (contact.lead_name.trim().length < 2) errs.lead_name = "Informe seu nome.";
    const phoneDigits = contact.lead_phone.replace(/\D/g, "");
    const hasPhone = phoneDigits.length >= 10;
    const hasEmail = !!contact.lead_email.trim() && isValidEmail(contact.lead_email);
    if (contact.lead_phone && !hasPhone) errs.lead_phone = "Informe um WhatsApp válido com DDD.";
    if (contact.lead_email && !isValidEmail(contact.lead_email)) errs.lead_email = "Informe um e-mail válido.";
    if (!hasPhone && !hasEmail) errs.lead_phone = "Informe WhatsApp ou e-mail para contato.";
    if (!contact.privacy_consent) errs.privacy_consent = "É necessário autorizar o contato.";
    setContactErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (status === "saving") return;
    if (!validateContact()) return;
    setStatus("saving");
    setError(null);
    try {
      await submitFn({
        data: {
          interest_type: interest,
          answers,
          lead_name: contact.lead_name.trim(),
          lead_phone: contact.lead_phone.replace(/\D/g, ""),
          lead_email: contact.lead_email.trim(),
          lead_current_city: contact.lead_current_city.trim(),
          preferred_contact_channel: contact.preferred_contact_channel,
          preferred_contact_period: contact.preferred_contact_period,
          privacy_consent: true as const,
          ...readTracking(),
        },
      });
      completedRef.current = true;
      setStatus("success");
      trackRadar("radar_completed", { interest_type: interest, ...readTracking() });
      try {
        window.localStorage.removeItem(RADAR_STORAGE_KEY);
      } catch {
        /* noop */
      }
    } catch (err) {
      console.error("[radar] submit failed", err);
      setStatus("error");
      setError("Não foi possível enviar agora. Verifique sua conexão e tente novamente.");
    }
  };

  const summaryItems = [
    { label: "Objetivo", value: interest ? interestLabel(interest) : null },
    { label: "Região", value: pick(answers, REGION_KEYS) },
    { label: "Faixa de valor", value: pick(answers, BUDGET_KEYS) },
    { label: "Prazo", value: pick(answers, TIMELINE_KEYS) },
    { label: "Canal de contato", value: contact.preferred_contact_channel },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Radar S.A. Imóveis"
        tabIndex={-1}
        className="relative z-10 w-full md:w-[min(100%,860px)] md:max-h-[90vh] h-full md:h-auto bg-[#EAEAE6] md:rounded-2xl overflow-y-auto outline-none"
      >
        <div className="sticky top-0 z-10 bg-[#EAEAE6]/95 backdrop-blur px-5 md:px-10 pt-5 pb-4 border-b border-black/10">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#1A1A1A]/60">
              Radar S.A. Imóveis
            </p>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fechar o Radar"
              className="p-2 -mr-2 text-[#0D0D0D] hover:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2DA00]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {status !== "success" ? (
            <div className="mt-3">
              <RadarProgress current={step + 1} total={interest ? totalSteps : 3} />
            </div>
          ) : null}
        </div>

        <div className="px-5 md:px-10 py-8 md:py-10">
          {status === "success" ? (
            <RadarSuccess items={summaryItems} onClose={onClose} search={radarToPropertySearch(interest, answers)} />
          ) : step === 0 ? (
            <div>
              <h3 className="font-display text-2xl md:text-3xl font-medium text-[#0D0D0D]">
                Qual é seu principal objetivo?
              </h3>
              <div className="mt-6">
                <InterestCards
                  value={interest}
                  onSelect={(v) => {
                    setFieldError(null);
                    if (v !== interest) setAnswers({});
                    setInterest(v);
                  }}
                />
              </div>
              {fieldError ? (
                <p role="alert" className="mt-4 text-sm text-red-600">
                  {fieldError}
                </p>
              ) : null}
            </div>
          ) : currentQuestion ? (
            <RadarQuestionField
              key={currentQuestion.id}
              question={currentQuestion}
              answers={answers}
              onChange={setAnswer}
              error={fieldError}
            />
          ) : isContactStep ? (
            <>
              <RadarContactForm value={contact} onChange={setContact} errors={contactErrors} />
              {error ? (
                <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        {status !== "success" ? (
          <div className="sticky bottom-0 bg-[#EAEAE6]/95 backdrop-blur border-t border-black/10 px-5 md:px-10 py-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-semibold text-[#0D0D0D] disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2DA00]"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            {isContactStep ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={status === "saving"}
                className="inline-flex items-center justify-center gap-2 bg-[#F2DA00] text-[#0D0D0D] px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] hover:brightness-95 disabled:opacity-60"
              >
                {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {status === "saving" ? "Salvando" : "Ativar meu radar"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center justify-center bg-[#0D0D0D] text-white px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#0D0D0D]/85"
              >
                Continuar
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
