import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getEditorialBySlug } from "@/lib/editorial.functions";

/**
 * /artigos/* era o endereço das "publicações simbólicas" (textos provisórios) e duplicava
 * posts do blog. Desde 17/11/2026 o caminho só redireciona (301): para o post publicado
 * de mesmo slug, ou para o conteúdo real que substituiu o texto provisório.
 */
const ARTIGO_DESTINO: Record<string, string> = {
  "alphaville-escolas": "/temas/educacao",
  "alphaville-calcadao": "/temas/gastronomia",
  "alphaville-mobilidade": "/guia/os-melhores-bairros-para-morar-em-alphaville-guia-completo-para-escolher-a-regia",
  "alphaville-saude": "/blog/hospitais-e-clinicas-de-referencia-em-alphaville",
  "tambore-residenciais": "/guia/tambore-barueri",
  "barueri-mobilidade": "/guia-barueri",
  "santana-centro-historico": "/guia/centro-historico-santana-de-parnaiba",
  "santana-residenciais": "/blog/condominios-de-santana-de-parnaiba-guia-completo-dos-melhores-residenciais",
  "mercado-locacao": "/guia/locacao-de-alto-padrao-em-alphaville",
  "mercado-corporativo": "/blog/mercado-corporativo-eixo-castelo-branco",
  "investimento-renda": "/guia/locacao-de-alto-padrao-em-alphaville",
  "investimento-capital": "/blog/mercado-condominios-valorizados",
  "restaurantes-alta-cozinha": "/temas/gastronomia",
  "restaurantes-pizzarias": "/temas/gastronomia",
  "restaurantes-hamburguerias": "/temas/gastronomia",
  "restaurantes-mercados": "/temas/gastronomia",
};

const BASE: Record<string, string> = {
  blog: "/blog", guia: "/guia", condominio: "/condominios", bairro: "/bairros",
  empreendimento: "/empreendimentos", parceiro: "/parceiros",
};

export const Route = createFileRoute("/artigos/$slug")({
  loader: async ({ params }) => {
    const cms = await getEditorialBySlug({ data: { slug: params.slug } }).catch(() => null);
    const base = cms ? BASE[cms.content_type as string] : undefined;
    const href = base ? `${base}/${params.slug}` : cms?.content_type === "hub" ? `/${params.slug}` : ARTIGO_DESTINO[params.slug];
    if (href) throw redirect({ href, statusCode: 301 });
    throw notFound();
  },
  component: () => null,
});
