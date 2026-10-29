import { createFileRoute } from "@tanstack/react-router";
import { OwnerLanding } from "@/components/owner/owner-landing";
import { ownerHead } from "@/lib/owner-head";
import { ownerPage } from "@/lib/owner-pages";

export const Route = createFileRoute("/vender-meu-imovel")({
  head: () => ownerHead("/vender-meu-imovel"),
  component: VenderPage,
});

function VenderPage() {
  return <OwnerLanding page={ownerPage("/vender-meu-imovel")} />;
}
