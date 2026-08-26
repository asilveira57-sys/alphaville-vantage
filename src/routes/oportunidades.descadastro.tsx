import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { unsubscribeFromOpportunities } from "@/lib/opportunity-subscribers.functions";

const SITE_URL = "https://alphaville-vantage.lovable.app";
const TITLE = "Sair da lista de oportunidades — S.A Imóveis Alphaville";

export const Route = createFileRoute("/oportunidades/descadastro")({
  head: () => ({
    meta: [
      { title: TITLE },
      {
        name: "description",
        content: "Cancele o recebimento das oportunidades da S.A Imóveis Alphaville.",
      },
      // Página de serviço: não deve competir com o hub na busca.
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/oportunidades/descadastro` }],
  }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const unsubscribeFn = useServerFn(unsubscribeFromOpportunities);
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);

  const unsubscribe = useMutation({
    mutationFn: () => unsubscribeFn({ data: { contact: contact.trim() } }),
    onError: (e: Error) => setError(e.message),
  });

  return (
    <SiteLayout>
      <section className="px-6 py-24">
        <div className="mx-auto max-w-xl">
          <h1 className="font-serif text-3xl leading-tight md:text-4xl">
            Sair da lista de oportunidades
          </h1>

          {unsubscribe.isSuccess ? (
            <div className="mt-10 flex items-start gap-4 border border-ink/15 p-6">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#F2DA00]" strokeWidth={2.5} />
              <div>
                <p className="font-serif text-xl">Pedido registrado</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Se esse contato estiver na nossa lista, ele não receberá mais as oportunidades.
                  Como os envios são preparados manualmente, uma mensagem já em preparo pode ainda
                  chegar nos próximos dias.
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-6 max-w-[54ch] leading-relaxed text-muted-foreground">
                Informe o e-mail ou o WhatsApp que você cadastrou. O cancelamento é imediato e não
                afeta seu atendimento com a nossa equipe.
              </p>

              <form
                className="mt-8 grid gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setError(null);
                  unsubscribe.mutate();
                }}
              >
                <div>
                  <label
                    htmlFor="unsub-contact"
                    className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    E-mail ou WhatsApp
                  </label>
                  <input
                    id="unsub-contact"
                    required
                    className="w-full border border-ink/15 bg-white px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2DA00]"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="voce@email.com ou (11) 99999-9999"
                  />
                </div>

                {error ? (
                  <p className="border-l-2 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={unsubscribe.isPending}
                  className="inline-flex w-fit items-center gap-2 bg-[#F2DA00] px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D] transition hover:brightness-95 disabled:opacity-50"
                >
                  {unsubscribe.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                    </>
                  ) : (
                    "Cancelar recebimento"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
