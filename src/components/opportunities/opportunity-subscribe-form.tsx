import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import {
  subscribeToOpportunities,
  AUDIENCES,
  AUDIENCE_LABEL,
  CONSENT_TEXT_EMAIL,
  CONSENT_TEXT_WHATSAPP,
  type Audience,
} from "@/lib/opportunity-subscribers.functions";

const REGIONS = ["Alphaville", "Tamboré", "Barueri", "Santana de Parnaíba"];
const TYPES = ["Casa", "Apartamento", "Terreno", "Cobertura"];

type Tone = "dark" | "light";

/**
 * Captação da lista de oportunidades.
 *
 * Duas coisas aqui não são estilo, são requisito: as caixas de canal vêm
 * **desmarcadas e separadas** (consentimento genérico é nulo pela LGPD
 * art. 8º §4º) e o link da política fica visível no ponto de coleta
 * (art. 9º). Mexer nisso quebra a validade do cadastro inteiro.
 */
export function OpportunitySubscribeForm({ tone = "dark" }: { tone?: Tone }) {
  const dark = tone === "dark";
  const subscribeFn = useServerFn(subscribeToOpportunities);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [audience, setAudience] = useState<Audience>("investidor");
  const [consentEmail, setConsentEmail] = useState(false);
  const [consentWhatsapp, setConsentWhatsapp] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [empresa, setEmpresa] = useState("");
  const [error, setError] = useState<string | null>(null);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const subscribe = useMutation({
    mutationFn: () =>
      subscribeFn({
        data: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          audience,
          consentEmail,
          consentWhatsapp,
          empresa,
          filters: { regions, propertyTypes: types },
          landingPage: typeof window !== "undefined" ? window.location.pathname : undefined,
        },
      }),
    onError: (e: Error) => setError(e.message),
  });

  const label = dark ? "text-[#EAEAE6]/50" : "text-[#1A1A1A]/50";
  const input = dark
    ? "w-full border border-[#EAEAE6]/20 bg-transparent px-3 py-2.5 text-sm text-[#EAEAE6] placeholder:text-[#EAEAE6]/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2DA00]"
    : "w-full border border-[#0D0D0D]/15 bg-white px-3 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#1A1A1A]/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2DA00]";
  const chip = (active: boolean) =>
    `px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] border transition ${
      active
        ? "bg-[#F2DA00] border-[#F2DA00] text-[#0D0D0D] font-semibold"
        : dark
          ? "border-[#EAEAE6]/25 text-[#EAEAE6]/70 hover:border-[#EAEAE6]/50"
          : "border-[#0D0D0D]/20 text-[#1A1A1A]/70 hover:border-[#0D0D0D]/45"
    }`;
  const body = dark ? "text-[#EAEAE6]/70" : "text-[#1A1A1A]/70";
  const muted = dark ? "text-[#EAEAE6]/45" : "text-[#1A1A1A]/50";

  if (subscribe.isSuccess) {
    return (
      <div
        className={`flex items-start gap-4 border p-6 ${
          dark ? "border-[#EAEAE6]/20" : "border-[#0D0D0D]/15 bg-white"
        }`}
      >
        <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#F2DA00]" strokeWidth={2.5} />
        <div>
          <p className={`font-display text-[20px] ${dark ? "text-[#EAEAE6]" : "text-[#0D0D0D]"}`}>
            Cadastro confirmado
          </p>
          <p className={`mt-2 max-w-[52ch] text-sm leading-relaxed ${body}`}>
            Você entra na próxima leva de oportunidades pelos canais que autorizou. Nossa equipe
            inclui os contatos na lista manualmente, então pode levar alguns dias até a primeira
            mensagem.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!consentEmail && !consentWhatsapp) {
          setError("Escolha ao menos um canal para receber as oportunidades.");
          return;
        }
        subscribe.mutate();
      }}
    >
      {/* Campo isca anti-robô: invisível e ignorado por humanos. */}
      <div style={{ display: "none" }} aria-hidden="true">
        <label>
          Empresa
          <input
            type="text"
            name="empresa"
            tabIndex={-1}
            autoComplete="off"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            className={`mb-1.5 block text-[10px] uppercase tracking-[0.18em] ${label}`}
            htmlFor="sub-name"
          >
            Nome
          </label>
          <input
            id="sub-name"
            required
            minLength={2}
            className={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>

        <div>
          <label
            className={`mb-1.5 block text-[10px] uppercase tracking-[0.18em] ${label}`}
            htmlFor="sub-email"
          >
            E-mail
          </label>
          <input
            id="sub-email"
            type="email"
            className={input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="voce@email.com"
          />
        </div>

        <div>
          <label
            className={`mb-1.5 block text-[10px] uppercase tracking-[0.18em] ${label}`}
            htmlFor="sub-phone"
          >
            WhatsApp
          </label>
          <input
            id="sub-phone"
            type="tel"
            className={input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="(11) 99999-9999"
          />
        </div>
      </div>

      <fieldset>
        <legend className={`mb-2 text-[10px] uppercase tracking-[0.18em] ${label}`}>
          Seu perfil
        </legend>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map((a) => (
            <button
              key={a}
              type="button"
              className={chip(audience === a)}
              aria-pressed={audience === a}
              onClick={() => setAudience(a)}
            >
              {AUDIENCE_LABEL[a]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={`mb-2 text-[10px] uppercase tracking-[0.18em] ${label}`}>
          Regiões de interesse <span className="normal-case tracking-normal">(opcional)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <button
              key={r}
              type="button"
              className={chip(regions.includes(r))}
              aria-pressed={regions.includes(r)}
              onClick={() => toggle(regions, setRegions, r)}
            >
              {r}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={`mb-2 text-[10px] uppercase tracking-[0.18em] ${label}`}>
          Tipo de imóvel <span className="normal-case tracking-normal">(opcional)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={chip(types.includes(t))}
              aria-pressed={types.includes(t)}
              onClick={() => toggle(types, setTypes, t)}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Canais: desmarcados e separados por exigência da LGPD art. 8º §4º. */}
      <fieldset className={`border-t pt-5 ${dark ? "border-[#EAEAE6]/15" : "border-[#0D0D0D]/12"}`}>
        <legend className={`text-[10px] uppercase tracking-[0.18em] ${label}`}>
          Como quer receber
        </legend>
        <div className="mt-3 grid gap-3">
          <label className={`flex cursor-pointer items-start gap-3 text-sm ${body}`}>
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#F2DA00]"
              checked={consentEmail}
              onChange={(e) => setConsentEmail(e.target.checked)}
            />
            <span>{CONSENT_TEXT_EMAIL}</span>
          </label>
          <label className={`flex cursor-pointer items-start gap-3 text-sm ${body}`}>
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#F2DA00]"
              checked={consentWhatsapp}
              onChange={(e) => setConsentWhatsapp(e.target.checked)}
            />
            <span>{CONSENT_TEXT_WHATSAPP}</span>
          </label>
        </div>
      </fieldset>

      {error ? (
        <p className="border-l-2 border-[#9E2B18] bg-[#9E2B18]/10 px-4 py-3 text-sm text-[#E8836C]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={subscribe.isPending}
          className="inline-flex items-center gap-2 bg-[#F2DA00] px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D] transition hover:brightness-95 disabled:opacity-50"
        >
          {subscribe.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
            </>
          ) : (
            "Quero receber as oportunidades"
          )}
        </button>
      </div>

      <p className={`max-w-[62ch] text-[12px] leading-relaxed ${muted}`}>
        Usamos seus dados apenas para enviar as oportunidades pelos canais que você autorizou. Você
        pode{" "}
        <Link
          to={"/oportunidades/descadastro" as never}
          className="underline underline-offset-2 hover:opacity-80"
        >
          sair da lista
        </Link>{" "}
        a qualquer momento, e pode ler nossa{" "}
        <Link
          to="/politica-de-privacidade"
          className="underline underline-offset-2 hover:opacity-80"
        >
          Política de Privacidade
        </Link>
        .
      </p>
    </form>
  );
}
