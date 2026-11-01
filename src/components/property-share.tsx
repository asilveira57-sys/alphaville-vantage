import { useEffect, useState } from "react";
import { Check, Copy, Facebook, Mail, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getPropertyBySlug } from "@/lib/property-detail.functions";
import { propertyShareMessage, shortShareTitle, trackedShareUrl, type ShareProperty } from "@/lib/property-sharing";

function ShareOptions({ property, purpose = "" }: { property: ShareProperty; purpose?: string }) {
  const [notice, setNotice] = useState("");
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches); }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 3000); return () => clearTimeout(timer); }, [notice]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(trackedShareUrl(`/imoveis/${property.slug}`, "copia")); setNotice("Link copiado"); }
    catch { setNotice("Não foi possível copiar o link. Tente compartilhar pelo WhatsApp."); }
  };
  const share = async () => {
    try {
      const url = trackedShareUrl(`/imoveis/${property.slug}`, "nativo");
      const message = propertyShareMessage(property, "nativo", purpose);
      await navigator.share({ title: shortShareTitle(property.title), text: message.replace(`\n\n${url}`, ""), url });
    } catch (error) { if (!(error instanceof Error && error.name === "AbortError")) setNotice("Não foi possível compartilhar. Use uma das outras opções."); }
  };
  return <div>
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="signal"><a target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(propertyShareMessage(property, "whatsapp", purpose))}`}><MessageCircle />WhatsApp</a></Button>
      <Button variant="outline" onClick={copy}>{notice === "Link copiado" ? <Check /> : <Copy />}Copiar link</Button>
      {native && <Button variant="outline" onClick={share}><Share2 />Compartilhar</Button>}
      <Button asChild variant="outline"><a target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(trackedShareUrl(`/imoveis/${property.slug}`, "facebook"))}`}><Facebook />Facebook</a></Button>
      <Button asChild variant="outline"><a href={`mailto:?subject=${encodeURIComponent(shortShareTitle(property.title))}&body=${encodeURIComponent(propertyShareMessage(property, "email", purpose))}`}><Mail />E-mail</a></Button>
    </div>
    <p role="status" className="mt-2 text-sm text-muted-foreground">{notice}</p>
  </div>;
}
export function PropertyShareBlock({ property }: { property: ShareProperty }) {
  return <div className="mt-6 border-t border-border pt-5"><h2 className="mb-3 text-sm font-semibold">Compartilhe este imóvel</h2><ShareOptions property={property} /></div>;
}
export function PropertyShareTrigger({ slug, purpose = "" }: { slug: string; purpose?: string }) {
  const [open, setOpen] = useState(false);
  const [property, setProperty] = useState<ShareProperty | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setError(false);
    getPropertyBySlug({ data: { slug } }).then(p => { if (active) { setProperty(p); setError(!p); } }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [open, slug]);
  return <>
    <Button variant="outline" size="icon" className="absolute right-3 bottom-3 z-10 shadow-sm" aria-label="Compartilhar imóvel" title="Compartilhar imóvel" onClick={() => setOpen(true)}><Share2 /></Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-md w-[calc(100%-2rem)] rounded-lg">
      <DialogTitle>Compartilhe este imóvel</DialogTitle>
      <DialogDescription>{property ? shortShareTitle(property.title) : error ? "Não foi possível carregar este imóvel." : "Carregando imóvel…"}</DialogDescription>
      {property && <ShareOptions property={property} purpose={purpose} />}
      {error && <Button variant="outline" onClick={() => { setOpen(false); }}>Fechar</Button>}
    </DialogContent></Dialog>
  </>;
}