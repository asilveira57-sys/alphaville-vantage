import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowUpRight, Clock, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { getPartnerAccess, applyAsPartner, listPartnerKits } from "@/lib/partners-area.functions";
import { PartnerAgreement } from "@/components/partners/partner-agreement";
import { BRAND, hasCreci } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/area-do-parceiro/")({
  head: () => ({
    meta: [
      { title: "Área do parceiro — S.A Imóveis Alphaville" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PartnerArea,
});

const input = "w-full border border-ink/15 bg-white px-3 py-2.5 text-sm";
const label = "mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground";

const brl = (n: number | null) =>
  n == null
    ? "Sob consulta"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(n);

function PartnerArea() {
  const qc = useQueryClient();
  const accessFn = useServerFn(getPartnerAccess);
  const applyFn = useServerFn(applyAsPartner);
  const kitsFn = useServerFn(listPartnerKits);

  const access = useQuery({ queryKey: ["partner", "access"], queryFn: () => accessFn({}) });
  const kits = useQuery({
    queryKey: ["partner", "kits"],
    queryFn: () => kitsFn({}),
    enabled: Boolean(access.data?.canAccessKits),
  });

  const [form, setForm] = useState({
    fullName: "",
    company: "",
    creci: "",
    phone: "",
    email: "",
  });
  const [accepted, setAccepted] = useState(false);

  const apply = useMutation({
    mutationFn: () =>
      applyFn({
        data: {
          fullName: form.fullName.trim(),
          company: form.company.trim(),
          creci: form.creci.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          acceptAgreement: true as const,
        },
      }),
    onSuccess: () => {
      toast.success("Solicitação enviada. Você recebe um retorno da nossa equipe.");
      qc.invalidateQueries({ queryKey: ["partner", "access"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (access.isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-6 py-24 text-sm text-muted-foreground">
          Carregando…
        </div>
      </SiteLayout>
    );
  }

  const status = access.data?.status ?? "none";

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-6 py-16">
        <header className="border-b border-ink/10 pb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {BRAND.name}
          </p>
          <h1 className="font-serif mt-3 text-3xl md:text-4xl">Área do parceiro</h1>
          <p className="mt-4 max-w-[64ch] leading-relaxed text-muted-foreground">
            Material aprovado das oportunidades da vitrine, para você divulgar sem inventar número
            nem promessa. Cada kit tem validade e sai do ar quando o imóvel deixa a seleção.
          </p>
        </header>

        {/* ------------------------------------------------------- pendente */}
        {status === "pending" && (
          <div className="mt-10 flex items-start gap-4 border border-ink/15 bg-ink/[0.02] p-6">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-serif text-xl">Solicitação em análise</p>
              <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
                Recebemos seu cadastro e o termo aceito. Nossa equipe confere o CRECI e libera o
                acesso — você pode voltar a esta página depois.
              </p>
            </div>
          </div>
        )}

        {(status === "rejected" || status === "revoked") && (
          <div className="mt-10 border-l-2 border-red-700 bg-red-50 p-6">
            <p className="font-serif text-xl text-red-900">
              {status === "rejected" ? "Cadastro não aprovado" : "Acesso encerrado"}
            </p>
            <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-red-900/80">
              {access.data?.profile?.review_notes ??
                "Fale com a nossa equipe para entender os próximos passos."}
            </p>
            <a
              href={`https://wa.me/${BRAND.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm underline"
            >
              Falar com a equipe
            </a>
          </div>
        )}

        {/* -------------------------------------------- termo desatualizado */}
        {access.data?.agreementOutdated && (
          <div className="mt-10 border-l-2 border-brand-yellow bg-ink/[0.03] p-6">
            <p className="font-serif text-xl">O termo de adesão mudou</p>
            <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
              Releia e aceite a versão atual para continuar acessando os kits. Seus dados continuam
              cadastrados.
            </p>
          </div>
        )}

        {/* ----------------------------------------------------- solicitação */}
        {(status === "none" || access.data?.agreementOutdated) && (
          <section className="mt-10">
            <h2 className="font-serif text-2xl">
              {status === "none" ? "Solicitar acesso" : "Aceitar a nova versão"}
            </h2>

            <form
              className="mt-6 grid gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!accepted) {
                  toast.error("É necessário aceitar o termo de adesão.");
                  return;
                }
                apply.mutate();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={label} htmlFor="p-name">
                    Nome completo
                  </label>
                  <input
                    id="p-name"
                    required
                    className={input}
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className={label} htmlFor="p-creci">
                    CRECI
                  </label>
                  <input
                    id="p-creci"
                    required
                    className={input}
                    placeholder="Ex.: CRECI 000000-F"
                    value={form.creci}
                    onChange={(e) => setForm({ ...form, creci: e.target.value })}
                  />
                </div>
                <div>
                  <label className={label} htmlFor="p-company">
                    Imobiliária (opcional)
                  </label>
                  <input
                    id="p-company"
                    className={input}
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                  />
                </div>
                <div>
                  <label className={label} htmlFor="p-phone">
                    WhatsApp
                  </label>
                  <input
                    id="p-phone"
                    required
                    className={input}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className={label} htmlFor="p-email">
                    E-mail (opcional)
                  </label>
                  <input
                    id="p-email"
                    type="email"
                    className={input}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <PartnerAgreement />

              <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#F2DA00]"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                <span>
                  Li e aceito o termo de adesão acima, e declaro ter contrato de intermediação para
                  divulgar os imóveis disponibilizados.
                </span>
              </label>

              <button
                type="submit"
                disabled={apply.isPending}
                className="w-fit bg-brand-yellow px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-dark transition hover:brightness-95 disabled:opacity-50"
              >
                {apply.isPending ? "Enviando…" : "Solicitar acesso"}
              </button>
            </form>
          </section>
        )}

        {/* ---------------------------------------------------------- kits */}
        {access.data?.canAccessKits && (
          <section className="mt-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Acesso liberado como parceiro
            </div>

            {!hasCreci() && (
              <div className="mt-6 border-l-2 border-red-700 bg-red-50 p-5 text-sm text-red-900">
                <strong>Kits indisponíveis:</strong> o CRECI da imobiliária ainda não foi
                configurado no sistema. Material publicitário sem o número de registro contraria a
                Resolução COFECI 458/95 art. 2º, então a impressão fica bloqueada até que a equipe
                preencha esse dado.
              </div>
            )}

            <h2 className="font-serif mt-8 text-2xl">Imóveis com material disponível</h2>

            {kits.isLoading ? (
              <p className="mt-6 text-sm text-muted-foreground">Carregando…</p>
            ) : (kits.data ?? []).length === 0 ? (
              <p className="mt-6 border border-ink/10 p-8 text-center text-sm text-muted-foreground">
                Nenhum imóvel na vitrine no momento.
              </p>
            ) : (
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {(kits.data ?? []).map((k) => (
                  <li key={k.propertyId}>
                    <Link
                      to={"/area-do-parceiro/$slug" as never}
                      params={{ slug: k.slug } as never}
                      className="group flex h-full gap-4 border border-ink/12 p-4 transition hover:border-ink/35"
                    >
                      {k.image ? (
                        <img
                          src={k.image}
                          alt=""
                          loading="lazy"
                          className="h-24 w-32 shrink-0 object-cover"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium">{k.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[k.condominium_name ?? k.neighborhood, k.city]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <p className="mt-1 text-sm font-semibold">{brl(k.price_sale)}</p>
                        {k.expiresAt ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            material válido até {new Date(k.expiresAt).toLocaleDateString("pt-BR")}
                          </p>
                        ) : null}
                        <span className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest">
                          Abrir mídia kit
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </SiteLayout>
  );
}
