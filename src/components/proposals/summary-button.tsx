import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getProposalSummary, proposalWhatsappHref } from "@/lib/proposals.functions";

/** Abre o WhatsApp com o resumo (ficha de cada imóvel) + link da proposta. */
export function SummaryButton({
  proposal,
  className,
  label = "Resumo",
}: {
  proposal: { id: string; client_phone: string | null; client_name: string; broker_name: string; items: number; token: string };
  className?: string;
  label?: string;
}) {
  const fn = useServerFn(getProposalSummary);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className={className}
      onClick={async () => {
        setBusy(true);
        try {
          const props = await fn({ data: { id: proposal.id } });
          window.location.href = proposalWhatsappHref(proposal, props);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "…" : label}
    </button>
  );
}
