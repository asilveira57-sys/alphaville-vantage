import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { listAuditLog } from "@/lib/audit.functions";

export const Route = createFileRoute("/_authenticated/admin-auditoria")({
  head: () => ({
    meta: [
      { title: "Admin · Auditoria do CMS — Portal S.A" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminAuditoria,
});

const ENTITY_LABELS: Record<string, string> = {
  all: "Todos",
  media: "Mídia",
  editorial_page: "Páginas e posts",
  street: "Ruas",
  cta: "CTAs",
};

const ACTION_LABELS: Record<string, string> = {
  "media.upload": "Upload de imagem",
  "media.update": "Edição de imagem",
  "media.delete": "Exclusão de imagem",
  "media.migrate": "Migração de imagens",
  "page.create": "Página criada",
  "page.update": "Página atualizada",
  "page.publish": "Página publicada",
  "page.unpublish": "Página despublicada",
  "page.delete": "Página excluída",
  "street.create": "Rua criada",
  "street.update": "Rua atualizada",
  "street.publish": "Rua publicada",
  "street.delete": "Rua excluída",
  "cta.create": "CTA criado",
  "cta.update": "CTA atualizado",
  "cta.delete": "CTA excluído",
};

function AdminAuditoria() {
  const [entityType, setEntityType] = useState("all");
  const [page, setPage] = useState(1);
  const listFn = useServerFn(listAuditLog);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", entityType, page],
    queryFn: () => listFn({ data: { entityType, page, pageSize: 50 } }),
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / 50));

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-serif text-3xl font-bold">Auditoria do CMS</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Registro de uploads, alterações de SEO, mudanças de CTA e publicações, com autor e data.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {Object.entries(ENTITY_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setEntityType(value);
                setPage(1);
              }}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                entityType === value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              )}
              {!isLoading && (data?.items.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum registro para este filtro.
                  </td>
                </tr>
              )}
              {data?.items.map((entry) => (
                <tr key={entry.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <code className="break-all">
                      {JSON.stringify(entry.details ?? {}).slice(0, 220)}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-border px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-border px-3 py-1.5 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
