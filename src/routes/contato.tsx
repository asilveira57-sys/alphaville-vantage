import { createFileRoute } from "@tanstack/react-router";
import { SectionPage } from "@/components/section-page";
import { Phone, MessageCircle, Mail, MapPin, Clock } from "lucide-react";

const URL = "https://alphaville-vantage.lovable.app/contato";
const TITLE = "Contato — S.A Imóveis Alphaville";
const DESC =
  "Fale com a S.A Imóveis Alphaville. Endereço em Tamboré, telefones, WhatsApp, e-mail, horários e formulário para atendimento consultivo em Alphaville e região.";

const ADDR = "Av. Marcos Penteado de Ulhôa Rodrigues, 4053, Loja 4, Tamboré, Santana de Parnaíba - SP, 06543-001";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          name: "S.A Imóveis Alphaville",
          legalName: "Padilha Assessoria em Vendas Ltda",
          taxID: "13.349.385/0001-49",
          telephone: "+55-11-94788-8299",
          email: "contato@saimoveisalphaville.com.br",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Av. Marcos Penteado de Ulhôa Rodrigues, 4053 - Loja 4",
            addressLocality: "Santana de Parnaíba",
            addressRegion: "SP",
            postalCode: "06543-001",
            addressCountry: "BR",
          },
          openingHoursSpecification: [
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
              opens: "09:00",
              closes: "18:00",
            },
          ],
        }),
      },
    ],
  }),
  component: Contato,
});

function Contato() {
  return (
    <SectionPage
      eyebrow="Fale conosco"
      title="Contato"
      lead="Estamos em Tamboré, no eixo da Av. Marcos Penteado. Escolha o canal mais conveniente — respondemos em até 24 horas úteis."
      breadcrumbs={[{ label: "Contato" }]}
    >
      <div className="grid gap-12 md:grid-cols-2 max-w-6xl">
        <div className="space-y-8">
          <div>
            <h2 className="font-serif text-2xl mb-4">Canais diretos</h2>
            <ul className="space-y-4 text-ink/90">
              <li className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-1 text-brand-yellow" />
                <a href="tel:+5511947888299" className="hover:underline">(11) 94788-8299</a>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircle className="h-4 w-4 mt-1 text-brand-yellow" />
                <a href="https://wa.me/5511995515053" target="_blank" rel="noreferrer" className="hover:underline">WhatsApp (11) 99551-5053</a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-1 text-brand-yellow" />
                <a href="mailto:contato@saimoveisalphaville.com.br" className="hover:underline">contato@saimoveisalphaville.com.br</a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-1 text-brand-yellow" />
                <span>{ADDR}</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-1 text-brand-yellow" />
                <span>Seg a sex, 9h às 18h · Sáb sob agendamento</span>
              </li>
            </ul>
          </div>

          <div className="aspect-[4/3] w-full overflow-hidden border border-ink/10">
            <iframe
              title="Mapa da sede"
              loading="lazy"
              className="w-full h-full"
              src={`https://www.google.com/maps?q=${encodeURIComponent(ADDR)}&output=embed`}
            />
          </div>
        </div>

        <form className="space-y-5 border border-ink/10 p-8 bg-white">
          <h2 className="font-serif text-2xl">Envie uma mensagem</h2>
          <p className="text-sm text-muted-foreground -mt-2">Retorno em até 24 horas úteis.</p>

          <Field label="Nome" name="name" required maxLength={100} />
          <Field label="E-mail" name="email" type="email" required maxLength={255} />
          <Field label="Telefone / WhatsApp" name="phone" maxLength={20} />
          <div>
            <label htmlFor="msg" className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Mensagem</label>
            <textarea
              id="msg"
              name="message"
              required
              maxLength={1000}
              rows={5}
              className="w-full border border-ink/15 bg-canvas p-3 text-sm focus:outline-none focus:border-ink"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center bg-ink text-canvas px-6 py-3 text-xs uppercase tracking-widest font-medium hover:bg-ink/85"
          >
            Enviar mensagem
          </button>
        </form>
      </div>
    </SectionPage>
  );
}

function Field({ label, name, type = "text", required, maxLength }: { label: string; name: string; type?: string; required?: boolean; maxLength?: number }) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        className="w-full border border-ink/15 bg-canvas p-3 text-sm focus:outline-none focus:border-ink"
      />
    </div>
  );
}
