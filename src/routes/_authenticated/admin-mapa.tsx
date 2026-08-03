import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { checkIsAdmin } from "@/lib/admin.functions";
import { listEditorialPages } from "@/lib/editorial.functions";

export const Route = createFileRoute("/_authenticated/admin-mapa")({
  head: () => ({
    meta: [{ title: "Admin · Mapa do sistema — Portal S.A" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminMapa,
});

type Area = {
  title: string;
  description: string;
  admin: string;
  site?: string;
  create?: string;
  type?: string;
};

const AREAS: Area[] = [
  {
    title: "Blog e artigos",
    description: "Posts, artigos editoriais, FAQ do post, CTA e SEO.",
    admin: "/cms",
    site: "/blog",
    create: "/cms/novo",
    type: "blog",
  },
  {
    title: "Bairros",
    description: "Páginas de bairro (/bairros/slug). Editadas no CMS pelo tipo “Bairro”.",
    admin: "/cms",
    site: "/bairros",
    create: "/cms/novo",
    type: "bairro",
  },
  {
    title: "Condomínios",
    description: "Páginas de condomínio (/condominios/slug). Tipo “Condomínio” no CMS.",
    admin: "/cms",
    site: "/condominios",
    create: "/cms/novo",
    type: "condominio",
  },
  {
    title: "Guias locais",
    description: "Guias (/guia/slug) e hubs regionais (Alphaville, Tamboré, Barueri, Santana).",
    admin: "/cms",
    site: "/guia",
    create: "/cms/novo",
    type: "guia",
  },
  {
    title: "Hubs regionais",
    description: "Páginas-hub com cards (Guia Alphaville, Guia Tamboré, Mercado…). Tipo “Hub”.",
    admin: "/cms",
    site: "/guia-alphaville",
    create: "/cms/novo",
    type: "hub",
  },
  {
    title: "Empreendimentos",
    description: "Novas páginas de empreendimento pelo CMS (tipo “Empreendimento”); galeria, plantas e tour no painel próprio.",
    admin: "/admin-empreendimentos",
    site: "/parceiros/mpd",
    create: "/cms/novo",
    type: "empreendimento",
  },
  {
    title: "Parceiros",
    description: "Novas páginas de parceiro (/parceiros/slug) criadas pelo CMS com o tipo “Parceiro”.",
    admin: "/cms",
    site: "/parceiros/mpd",
    create: "/cms/novo",
    type: "parceiro",
  },
  {
    title: "Ruas e avenidas",
    description: "Guia de ruas com conteúdo, mídia, SEO e vínculo automático de imóveis.",
    admin: "/admin-ruas",
    site: "/guia-de-ruas",
  },
  {
    title: "Institucionais",
    description: "Quem somos, serviços, LGPD, políticas e demais páginas fixas. Tipo “Institucional”.",
    admin: "/cms",
    site: "/quem-somos",
    create: "/cms/novo",
    type: "institucional",
  },
  {
    title: "Imóveis",
    description: "Base de imóveis, importação, revisão e SEO automático das fichas.",
    admin: "/admin",
    site: "/imoveis",
  },
  {
    title: "Biblioteca de mídia",
    description: "Upload central, alt text, legendas, créditos e onde cada imagem é usada.",
    admin: "/admin-midia",
  },
  {
    title: "CTAs",
    description: "Blocos de conversão reutilizáveis e padrões por tipo de conteúdo.",
    admin: "/admin-ctas",
  },
  {
    title: "Central de SEO",
    description: "Sitemap, IndexNow, redirecionamentos e auditoria técnica.",
    admin: "/admin-seo",
  },
  {
    title: "Radar / leads",
    description: "Leads qualificados do Radar S.A. Imóveis e origem das conversões.",
    admin: "/admin-radar",
    site: "/",
  },
  {
    title: "Auditoria",
    description: "Histórico de todas as alterações feitas no CMS.",
    admin: "/admin-auditoria",
  },
];

function AdminMapa() {
  const checkFn = useServerFn(checkIsAdmin);
  const listFn = useServerFn(listEditorialPages);
  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });
  const pagesQ = useQuery({
    queryKey: ["cms", "all-for-map"],
    queryFn: () => listFn({ data: {} }),
    enabled: !!adminQ.data?.isAdmin,
  });

  if (adminQ.isLoading) {
    return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground">Carregando…</div></SiteLayout>;
  }
  if (!adminQ.data?.isAdmin) {
    return (
      <SiteLayout>
        <div className="px-6 py-24 text-center text-sm text-muted-foreground">
          Acesso restrito. <Link to="/admin" className="underline">Ir para o painel</Link>.
        </div>
      </SiteLayout>
    );
  }

  const rows = pagesQ.data ?? [];
  const countByType = (t?: string) => (t ? rows.filter((r: any) => r.content_type === t).length : null);

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-10">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Administração</p>
            <h1 className="font-serif text-4xl text-ink">Mapa do sistema</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-[70ch]">
              Todas as áreas editáveis do portal e onde cada tipo de página é criado e alterado.
            </p>
          </div>
          <Link to="/admin" className="text-xs uppercase tracking-widest border border-ink/20 px-4 py-2 hover:bg-ink/5">← Painel</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AREAS.map((a) => {
            const count = countByType(a.type);
            return (
              <section key={a.title} className="border border-ink/10 p-5 flex flex-col gap-3">
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-serif text-xl text-ink">{a.title}</h2>
                    {count !== null && (
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{count} página(s)</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{a.description}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-widest mt-auto pt-2">
                  <a href={a.admin} className="bg-ink text-canvas px-3 py-2 hover:bg-ink/85">Editar no admin</a>
                  {a.create && <a href={a.create} className="border border-ink/20 px-3 py-2 hover:bg-ink/5">+ Nova página</a>}
                  {a.site && (
                    <a href={a.site} target="_blank" rel="noreferrer" className="px-3 py-2 text-muted-foreground hover:text-ink">Ver no site →</a>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <section className="border border-ink/10 p-5">
          <h2 className="font-serif text-xl text-ink mb-2">Como criar uma página nova</h2>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-5">
            <li>Abra o CMS Editorial e clique em <strong className="text-ink">+ Nova página</strong>.</li>
            <li>Escolha o <strong className="text-ink">tipo de conteúdo</strong> (bairro, condomínio, guia, empreendimento, parceiro…). É o tipo que define a URL pública.</li>
            <li>Preencha título, resumo, imagem, conteúdo, SEO e CTA.</li>
            <li>Publique — a página entra automaticamente no sitemap.</li>
          </ol>
        </section>
      </div>
    </SiteLayout>
  );
}
