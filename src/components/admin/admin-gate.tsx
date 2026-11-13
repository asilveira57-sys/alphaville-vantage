import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { checkIsAdmin } from "@/lib/admin.functions";

/** Mostra o conteúdo só para administradores; os demais veem "Acesso restrito". */
export function AdminGate({ children }: { children: ReactNode }) {
  const checkFn = useServerFn(checkIsAdmin);
  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });

  if (adminQ.isLoading) {
    return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground">Carregando…</div></SiteLayout>;
  }
  if (!adminQ.data?.isAdmin) {
    return (
      <SiteLayout>
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">Acesso restrito</p>
          <h1 className="font-serif text-3xl text-ink mb-4">Sem permissão de admin</h1>
          <Link to="/admin" className="text-xs uppercase tracking-widest text-ink hover:underline">Voltar ao admin</Link>
        </div>
      </SiteLayout>
    );
  }
  return <>{children}</>;
}

export function AdminPageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap mb-10">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">{eyebrow}</p>
        <h1 className="font-serif text-4xl text-ink">{title}</h1>
      </div>
      {children}
    </div>
  );
}
