import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { AdminGate } from "@/components/admin/admin-gate";
import { ProposalEditor } from "@/components/proposals/proposal-editor";

export const Route = createFileRoute("/_authenticated/admin-propostas/$id")({
  head: () => ({ meta: [{ title: "Admin · Proposta — Portal S.A" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminProposalEditor,
});

function AdminProposalEditor() {
  const { id } = Route.useParams();
  return (
    <AdminGate>
      <SiteLayout>
        <ProposalEditor key={id} id={id} backTo="/admin-propostas" />
      </SiteLayout>
    </AdminGate>
  );
}
