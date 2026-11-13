// Menu do painel admin: única fonte das rotas, grupos e descrições.
// Usado pela barra lateral (AdminShell) e pelos cards da página inicial do admin.
// Ao criar uma rota de admin nova, acrescente-a aqui para ela aparecer no menu.

export type AdminNavItem = {
  label: string;
  to: string;
  description: string;
  /** Prefixos extras que também marcam o item como ativo (ex.: /cms/123). */
  match?: string[];
};

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_HOME = "/admin";

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    id: "imoveis",
    label: "Imóveis",
    items: [
      { label: "Sincronização com a Univen", to: "/admin-conciliacao", description: "Execuções da sincronização, alertas e “Sincronizar agora”." },
      { label: "Auditoria dos anúncios", to: "/audit", description: "Ficha de cada imóvel: dados, SEO e correções manuais.", match: ["/audit/"] },
      { label: "Auditoria de valores", to: "/admin-valores", description: "Preços, condomínio e IPTU fora do padrão." },
      { label: "Fotos dos imóveis", to: "/admin-fotos-imoveis", description: "Baixar fotos (ZIP) e acervo." },
      { label: "Sem foto real", to: "/admin-sem-foto", description: "Imóveis sem foto própria." },
      { label: "Importar por link", to: "/admin-importar-imovel", description: "Cadastrar um imóvel colando o link do site principal." },
      { label: "Imóveis bloqueados", to: "/admin-imoveis-bloqueados", description: "Removidos do portal e impedidos de voltar." },
      { label: "Etiquetas da Univen", to: "/admin-etiquetas-univen", description: "Etiqueta “Empreendimento” × condomínio do portal." },
      { label: "Recaptura (simulação)", to: "/admin-recaptura", description: "Simula a recaptura sem gravar nada." },
    ],
  },
  {
    id: "oportunidades",
    label: "Oportunidades",
    items: [
      { label: "Vitrine de Oportunidades", to: "/admin-oportunidades", description: "Curadoria, ordem, validade e selo de preço." },
      { label: "Lista de oportunidades", to: "/admin-lista-oportunidades", description: "Contatos que pediram as oportunidades (CSV)." },
      { label: "Parceiros (corretores)", to: "/admin-parceiros", description: "Acesso ao mídia kit: aprovar e revogar." },
      { label: "Simulador de financiamento", to: "/admin-financiamento", description: "Taxas e simulações enviadas." },
    ],
  },
  {
    id: "locais",
    label: "Condomínios e locais",
    items: [
      { label: "Central de condomínios", to: "/admin-condominios", description: "Cadastro oficial, apelidos e guias." },
      { label: "Ruas e avenidas", to: "/admin-ruas", description: "Guia de ruas, mídia e SEO.", match: ["/admin-ruas/"] },
      { label: "Relatórios de ruas", to: "/admin-ruas/relatorios", description: "Cobertura e pendências do guia de ruas." },
      { label: "Empreendimentos", to: "/admin-empreendimentos", description: "Páginas de lançamento: galeria, plantas e tour." },
      { label: "Incorporadoras", to: "/admin-incorporadoras", description: "Incorporadoras parceiras." },
    ],
  },
  {
    id: "conteudo",
    label: "Conteúdo",
    items: [
      { label: "CMS editorial", to: "/cms", description: "Blog, bairros, guias, hubs e institucionais.", match: ["/cms/"] },
      { label: "Artigos e IA", to: "/admin-artigos", description: "Lista de posts e rascunho de artigo com IA." },
      { label: "Conteúdo pendente", to: "/admin-pendentes", description: "Páginas incompletas ou a revisar." },
      { label: "Biblioteca de mídia", to: "/admin-midia", description: "Upload, alt text, créditos e uso das imagens." },
      { label: "Imagens dos cards", to: "/admin-cards", description: "Destaques, hubs e capas de condomínio." },
      { label: "CTAs", to: "/admin-ctas", description: "Blocos de conversão reutilizáveis." },
      { label: "Auditoria do CMS", to: "/admin-auditoria", description: "Qualidade das páginas editoriais." },
    ],
  },
  {
    id: "leads",
    label: "Leads",
    items: [
      { label: "Leads (CRM)", to: "/admin-leads", description: "Todos os contatos dos formulários, com a origem." },
      { label: "Radar S.A", to: "/admin-radar", description: "Respostas do questionário Radar." },
      { label: "Pesquisa inteligente", to: "/admin-leads-pesquisa", description: "Buscas salvas pelos visitantes." },
    ],
  },
  {
    id: "email",
    label: "E-mail",
    items: [
      { label: "E-mails dos formulários", to: "/admin-emails", description: "Textos e envios automáticos." },
      { label: "Campanhas (e-mail marketing)", to: "/admin-campanhas", description: "Listas, campanhas e envios pelo Resend." },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [
      { label: "Equipe e acessos", to: "/admin-equipe", description: "Cadastrar colaboradores e tirar acessos." },
      { label: "Central de SEO", to: "/admin-seo", description: "Sitemap, IndexNow e redirecionamentos." },
      { label: "Mapa do sistema", to: "/admin-mapa", description: "Onde cada tipo de página é editado no site." },
      { label: "Ferramentas antigas", to: "/admin-legado", description: "Crawler antigo e reprocessamentos (desligados)." },
    ],
  },
];

const PREFIXES = ["/admin", "/cms", "/audit"];

/** Rotas que mostram a barra lateral do admin. A área do parceiro fica de fora. */
export function isAdminPath(pathname: string): boolean {
  return PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "-"));
}

export function isItemActive(item: AdminNavItem, pathname: string): boolean {
  if (pathname === item.to) return true;
  return (item.match ?? []).some((m) => pathname.startsWith(m));
}
