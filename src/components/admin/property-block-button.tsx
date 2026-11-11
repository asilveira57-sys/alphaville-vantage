import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Ban, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { setPropertyBlocked } from "@/lib/property-blocking.functions";

export function PropertyBlockButton({ id, code, blocked = false, onSuccess }: { id: string; code: string; blocked?: boolean; onSuccess: () => void }) {
  const action = useServerFn(setPropertyBlocked);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    setBusy(true); setError(null);
    try { await action({ data: { id, blocked: !blocked } }); setOpen(false); onSuccess(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar"); }
    finally { setBusy(false); }
  }
  return <AlertDialog open={open} onOpenChange={setOpen}>
    <AlertDialogTrigger asChild><Button variant={blocked ? "outline" : "destructive"} size="sm">{blocked ? <Unlock /> : <Ban />}{blocked ? "Desbloquear" : "Excluir e bloquear"}</Button></AlertDialogTrigger>
    <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
      <AlertDialogHeader><AlertDialogTitle>{blocked ? "Desbloquear" : "Excluir e bloquear"} {code}?</AlertDialogTitle>
        <AlertDialogDescription>{blocked ? "O imóvel ficará pausado e poderá voltar na próxima sincronização. Seus dados serão preservados." : "O imóvel sairá da busca, sitemap, condomínio, vitrine e PDFs. A página responderá 410 (removido), e a sincronização não poderá trazê-lo de volta. Os dados serão preservados para eventual desbloqueio."}</AlertDialogDescription></AlertDialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><Button variant={blocked ? "default" : "destructive"} disabled={busy} onClick={confirm}>{busy ? "Salvando…" : blocked ? "Confirmar desbloqueio" : "Confirmar bloqueio"}</Button></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}