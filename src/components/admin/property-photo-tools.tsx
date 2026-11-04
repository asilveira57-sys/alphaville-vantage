import { useEffect, useState } from "react";
import { useHydrated } from "@tanstack/react-router";
import { Download, Archive, LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkIsAdmin } from "@/lib/admin.functions";
import {
  downloadPropertyPhotosZip,
  savePropertyToAcervo,
} from "@/lib/property-photos.functions";
import { Button } from "@/components/ui/button";

// Botões de fotos do imóvel, visíveis só para admin. Usado na ficha pública
// (some para visitantes) e na tela /admin-fotos-imoveis.

function base64ToBlob(base64: string, type: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export function PropertyPhotoTools({ propertyId, inAcervo, photoCount, downloadOnly = false }: { propertyId: string; inAcervo?: boolean; photoCount?: number; downloadOnly?: boolean }) {
  const hydrated = useHydrated();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  const checkFn = useServerFn(checkIsAdmin);
  const { data: admin } = useQuery({
    queryKey: ["photo-tools-admin", userId],
    queryFn: () => checkFn(),
    enabled: hydrated && Boolean(userId),
    staleTime: 60_000,
    retry: false,
  });
  const zipFn = useServerFn(downloadPropertyPhotosZip);
  const acervoFn = useServerFn(savePropertyToAcervo);
  const [busy, setBusy] = useState<"zip" | "acervo" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [links, setLinks] = useState<Array<{ path: string; url: string | null }> | null>(null);
  const [saved, setSaved] = useState(Boolean(inAcervo));

  if (!hydrated || !userId || !admin?.isAdmin) return null;

  const onZip = async () => {
    setBusy("zip");
    setMsg(null);
    try {
      const r = await zipFn({ data: { propertyId } });
      const blob = base64ToBlob(r.base64, "application/zip");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setMsg(r.count < r.total
        ? `Atenção: ${r.total - r.count} foto(s) falharam. ZIP baixado com ${r.count} de ${r.total} fotos.`
        : `ZIP com ${r.count} fotos baixado.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao montar o ZIP");
    } finally {
      setBusy(null);
    }
  };

  const onAcervo = async () => {
    setBusy("acervo");
    setMsg(null);
    try {
      const r = await acervoFn({ data: { propertyId } });
      setSaved(true);
      setLinks(r.links);
      setMsg(`${r.saved} de ${r.total} fotos copiadas para o acervo (pasta ${r.folder}).`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao salvar no acervo");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={downloadOnly ? "text-xs space-y-2" : "mb-4 border-b border-border pb-3 text-xs space-y-2"}>
      {!downloadOnly && <p className="uppercase tracking-widest text-muted-foreground">
        Admin · Fotos {saved && <span className="ml-1 rounded bg-ink px-1.5 py-0.5 text-[10px] text-canvas">no acervo</span>}
      </p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={busy !== null} onClick={onZip}>
          {busy === "zip" ? <LoaderCircle className="size-4 motion-safe:animate-spin" /> : <Download className="size-4" />}
          {busy === "zip" ? `Baixando ${photoCount ?? "as"} fotos…` : "Baixar fotos (ZIP)"}
        </Button>
        {!downloadOnly && <Button size="sm" variant="outline" disabled={busy !== null} onClick={onAcervo}>
          <Archive className="size-4" />
          {busy === "acervo" ? "Copiando…" : "Salvar no acervo"}
        </Button>}
      </div>
      {msg && <p role="status" className="text-muted-foreground">{msg}</p>}
      {links && (
        <details>
          <summary className="cursor-pointer underline">Ver links do acervo (válidos por 5 minutos)</summary>
          <ul className="mt-1 space-y-0.5 break-all">
            {links.map((l) => (
              <li key={l.path}>
                <a href={l.url ?? "#"} target="_blank" rel="noreferrer" className="underline">
                  {l.path}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
