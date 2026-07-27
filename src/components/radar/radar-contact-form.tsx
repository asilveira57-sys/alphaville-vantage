import { CONTACT_CHANNELS, CONTACT_PERIODS } from "@/lib/radar-config";
import { maskPhone } from "./radar-utils";

export type RadarContactState = {
  lead_name: string;
  lead_phone: string;
  lead_email: string;
  lead_current_city: string;
  preferred_contact_channel: string;
  preferred_contact_period: string;
  privacy_consent: boolean;
};

export const EMPTY_CONTACT: RadarContactState = {
  lead_name: "",
  lead_phone: "",
  lead_email: "",
  lead_current_city: "",
  preferred_contact_channel: "WhatsApp",
  preferred_contact_period: "Qualquer horário comercial",
  privacy_consent: false,
};

type Props = {
  value: RadarContactState;
  onChange: (next: RadarContactState) => void;
  errors: Partial<Record<keyof RadarContactState, string>>;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-black/15 bg-white px-4 py-3 text-sm outline-none focus:border-[#0D0D0D] focus-visible:ring-2 focus-visible:ring-[#F2DA00]";
const labelClass = "block text-[11px] uppercase tracking-[0.18em] font-semibold text-[#1A1A1A]/60";

export function RadarContactForm({ value, onChange, errors }: Props) {
  const set = <K extends keyof RadarContactState>(key: K, v: RadarContactState[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="min-w-0">
      <h3 className="font-display text-2xl md:text-3xl font-medium text-[#0D0D0D]">
        Para onde devemos enviar as oportunidades?
      </h3>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label>
          <span className={labelClass}>Nome</span>
          <input
            className={inputClass}
            value={value.lead_name}
            autoComplete="name"
            aria-invalid={!!errors.lead_name}
            aria-describedby={errors.lead_name ? "err-name" : undefined}
            onChange={(e) => set("lead_name", e.target.value)}
          />
          {errors.lead_name && (
            <span id="err-name" role="alert" className="mt-1 block text-xs text-red-600">
              {errors.lead_name}
            </span>
          )}
        </label>
        <label>
          <span className={labelClass}>WhatsApp</span>
          <input
            className={inputClass}
            value={value.lead_phone}
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 90000-0000"
            aria-invalid={!!errors.lead_phone}
            aria-describedby={errors.lead_phone ? "err-phone" : undefined}
            onChange={(e) => set("lead_phone", maskPhone(e.target.value))}
          />
          {errors.lead_phone && (
            <span id="err-phone" role="alert" className="mt-1 block text-xs text-red-600">
              {errors.lead_phone}
            </span>
          )}
        </label>
        <label>
          <span className={labelClass}>E-mail</span>
          <input
            className={inputClass}
            value={value.lead_email}
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.lead_email}
            aria-describedby={errors.lead_email ? "err-email" : undefined}
            onChange={(e) => set("lead_email", e.target.value)}
          />
          {errors.lead_email && (
            <span id="err-email" role="alert" className="mt-1 block text-xs text-red-600">
              {errors.lead_email}
            </span>
          )}
        </label>
        <label>
          <span className={labelClass}>Cidade atual</span>
          <input
            className={inputClass}
            value={value.lead_current_city}
            autoComplete="address-level2"
            onChange={(e) => set("lead_current_city", e.target.value)}
          />
        </label>
        <label>
          <span className={labelClass}>Como prefere receber as oportunidades?</span>
          <select
            className={inputClass}
            value={value.preferred_contact_channel}
            onChange={(e) => set("preferred_contact_channel", e.target.value)}
          >
            {CONTACT_CHANNELS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelClass}>Melhor período para contato</span>
          <select
            className={inputClass}
            value={value.preferred_contact_period}
            onChange={(e) => set("preferred_contact_period", e.target.value)}
          >
            {CONTACT_PERIODS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-6 flex items-start gap-3 rounded-lg border border-black/10 bg-white p-4">
        <input
          type="checkbox"
          checked={value.privacy_consent}
          onChange={(e) => set("privacy_consent", e.target.checked)}
          aria-invalid={!!errors.privacy_consent}
          aria-describedby={errors.privacy_consent ? "err-consent" : undefined}
          className="mt-1 h-4 w-4 accent-[#0D0D0D]"
        />
        <span className="text-sm leading-relaxed text-[#1A1A1A]/75">
          Autorizo a S.A. Imóveis a utilizar estas informações para analisar meu perfil, apresentar
          oportunidades compatíveis e entrar em contato pelos canais informados.
          {errors.privacy_consent && (
            <span id="err-consent" role="alert" className="mt-1 block text-xs text-red-600">
              {errors.privacy_consent}
            </span>
          )}
        </span>
      </label>
    </div>
  );
}
