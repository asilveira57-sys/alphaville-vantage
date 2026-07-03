import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionPage } from "@/components/section-page";

const URL = "https://alphaville-vantage.lovable.app/perguntas-frequentes";
const TITLE = "Perguntas Frequentes — S.A Imóveis Alphaville";
const DESC =
  "Tire dúvidas sobre locação, venda, permuta, administração, reforma, documentação, contratos, condomínios e mercado imobiliário em Alphaville e região.";

const FAQ: { cat: string; items: { q: string; a: string }[] }[] = [
  {
    cat: "Sobre a empresa",
    items: [
      { q: "Quem é a S.A Imóveis Alphaville?", a: "É a marca da Padilha Assessoria em Vendas Ltda, consultoria imobiliária dedicada a Alphaville, Tamboré, Barueri e Santana de Parnaíba." },
      { q: "Onde fica a sede?", a: "Av. Marcos Penteado de Ulhôa Rodrigues, 4053, Loja 4, Tamboré, Santana de Parnaíba/SP, CEP 06543-001." },
      { q: "Quais regiões vocês atendem?", a: "Alphaville, Tamboré, Barueri e Santana de Parnaíba, com atuação em condomínios residenciais, empresariais e comerciais." },
      { q: "Quais serviços oferecem?", a: "Locação, venda, permuta, administração de imóveis e coordenação de reformas." },
    ],
  },
  {
    cat: "Locação",
    items: [
      { q: "Quais garantias vocês aceitam?", a: "Fiador, seguro-fiança, título de capitalização e caução em dinheiro, conforme o perfil do imóvel." },
      { q: "Qual o prazo médio para aprovação cadastral?", a: "Geralmente de 2 a 5 dias úteis, dependendo da modalidade de garantia e do envio da documentação." },
      { q: "Posso alugar imóvel sendo estrangeiro?", a: "Sim, mediante documentação específica e garantia compatível." },
      { q: "Quem faz a vistoria de entrada e saída?", a: "Empresa especializada e imparcial, contratada pela administração." },
      { q: "Quem paga a comissão de intermediação na locação?", a: "Em regra, o proprietário; podendo variar conforme contrato específico." },
    ],
  },
  {
    cat: "Venda",
    items: [
      { q: "Como o valor de venda é definido?", a: "Baseado em comparativos de mercado, características do imóvel, condomínio, localização e demanda atual." },
      { q: "Preciso de exclusividade para vender com vocês?", a: "Trabalhamos com e sem exclusividade; a exclusividade costuma acelerar o processo e concentrar esforços de marketing." },
      { q: "Vocês divulgam meu imóvel em quais canais?", a: "Portal próprio, redes sociais, parcerias, base ativa de clientes e portais imobiliários." },
      { q: "Quanto tempo leva para vender?", a: "Depende do preço, condição do imóvel, documentação e ciclo de mercado; oferecemos previsões realistas caso a caso." },
      { q: "Aceitam permuta como parte do pagamento?", a: "Sim, estruturamos permutas totais ou parciais, com avaliação técnica de ambos os imóveis." },
    ],
  },
  {
    cat: "Administração",
    items: [
      { q: "O que está incluso na administração?", a: "Cobrança, repasse, gestão de manutenções, vistorias, revisões e comunicação com o inquilino." },
      { q: "Como recebo o aluguel?", a: "Por transferência bancária ou Pix, com relatório mensal detalhado." },
      { q: "Vocês cuidam de reformas durante a locação?", a: "Sim, coordenamos manutenções e obras aprovadas pelo proprietário." },
      { q: "Como funciona a inadimplência?", a: "Iniciamos cobrança amigável imediata e, se necessário, encaminhamos ao jurídico, com relatórios periódicos ao proprietário." },
    ],
  },
  {
    cat: "Documentação",
    items: [
      { q: "Quais documentos preciso para alugar?", a: "RG, CPF, comprovante de renda, comprovante de residência e documentos da garantia escolhida." },
      { q: "Quais documentos preciso para vender?", a: "Matrícula atualizada, IPTU, condomínio em dia, certidões pessoais e do imóvel, e documentos dos proprietários." },
      { q: "O que é a matrícula atualizada?", a: "Certidão emitida pelo cartório de registro de imóveis com todas as informações e ônus do imóvel." },
      { q: "Quem paga o ITBI?", a: "Em regra, o comprador; devendo ser recolhido antes do registro." },
    ],
  },
  {
    cat: "Mercado e região",
    items: [
      { q: "Alphaville é um bom lugar para investir?", a: "Sim; é uma região com forte histórico de valorização, infraestrutura consolidada e demanda constante." },
      { q: "Qual a diferença entre Alphaville e Tamboré?", a: "Ambos fazem parte do mesmo eixo, com Tamboré concentrando residenciais e Alphaville abrangendo residenciais e o polo empresarial." },
      { q: "Onde ficam as principais escolas da região?", a: "Alphaville, Tamboré e entornos concentram escolas nacionais e internacionais de referência." },
      { q: "A região tem opções de lazer?", a: "Sim: parques, ciclovias, restaurantes, shoppings, clubes e áreas verdes preservadas." },
    ],
  },
  {
    cat: "Financiamento e pagamento",
    items: [
      { q: "Vocês ajudam com financiamento?", a: "Sim, indicamos correspondentes bancários e acompanhamos o processo com o comprador." },
      { q: "Aceitam FGTS?", a: "Sim, quando o imóvel e o comprador atendem aos critérios da Caixa." },
      { q: "É possível parcelar diretamente com o proprietário?", a: "Em alguns casos sim; sempre com estruturação jurídica adequada." },
      { q: "Quais formas de pagamento aceitam?", a: "Transferência bancária, Pix e financiamento bancário." },
    ],
  },
  {
    cat: "Atendimento",
    items: [
      { q: "Qual o horário de atendimento?", a: "Segunda a sexta das 9h às 18h; sábados sob agendamento." },
      { q: "Atendem por WhatsApp?", a: "Sim, é um dos nossos canais principais para retorno rápido." },
      { q: "Fazem visitas fora do horário comercial?", a: "Sob agendamento prévio, sim." },
      { q: "Como falo com o consultor responsável?", a: "Após o primeiro contato, você recebe o número direto do consultor designado." },
      { q: "É possível ser atendido remotamente?", a: "Sim, oferecemos visitas virtuais, reuniões online e assinatura eletrônica." },
    ],
  },
];

const flat = FAQ.flatMap((s) => s.items);

export const Route = createFileRoute("/perguntas-frequentes")({
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
          "@type": "FAQPage",
          mainEntity: flat.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: Faq,
});

function Faq() {
  return (
    <SectionPage
      eyebrow="Dúvidas"
      title="Perguntas frequentes"
      lead="Reunimos as dúvidas mais comuns sobre locação, venda, permuta, administração, documentação, financiamento e mercado imobiliário da região."
      breadcrumbs={[{ label: "Perguntas frequentes" }]}
    >
      <div className="grid md:grid-cols-[220px_1fr] gap-12 max-w-6xl">
        <nav aria-label="Índice" className="hidden md:block sticky top-24 self-start">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">Índice</p>
          <ul className="space-y-2 text-sm">
            {FAQ.map((s) => (
              <li key={s.cat}>
                <a href={`#${slug(s.cat)}`} className="hover:text-ink text-muted-foreground">{s.cat}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-16">
          {FAQ.map((section) => (
            <section key={section.cat} id={slug(section.cat)}>
              <h2 className="font-serif text-3xl mb-6">{section.cat}</h2>
              <div className="space-y-6">
                {section.items.map((f) => (
                  <div key={f.q} className="border-t border-ink/10 pt-4">
                    <h3 className="font-serif text-lg mb-2">{f.q}</h3>
                    <p className="text-ink/85 leading-relaxed">{f.a}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <div className="border-t border-ink/10 pt-6">
            <p className="text-sm text-muted-foreground">
              Não encontrou o que buscava?{" "}
              <Link to="/contato" className="underline underline-offset-4 hover:text-ink">Fale com um consultor</Link>.
            </p>
          </div>
        </div>
      </div>
    </SectionPage>
  );
}

function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
}
