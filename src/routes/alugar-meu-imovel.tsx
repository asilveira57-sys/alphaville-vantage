import { createFileRoute } from "@tanstack/react-router";
import { OwnerLanding } from "@/components/owner/owner-landing";
import { ownerHead } from "@/lib/owner-head";
import { ownerPage } from "@/lib/owner-pages";

export const Route = createFileRoute("/alugar-meu-imovel")({
  head: () => ownerHead("/alugar-meu-imovel"),
  component: AlugarPage,
});

function AlugarPage() {
  return <OwnerLanding page={ownerPage("/alugar-meu-imovel")} />;
}
