import { createFileRoute } from "@tanstack/react-router";
import { ProposalEditor } from "@/components/proposals/proposal-editor";
import { useCorretorSession } from "@/components/corretor/session";

export const Route = createFileRoute("/corretor/propostas/$id")({
  component: AppProposalEditor,
});

function AppProposalEditor() {
  const { id } = Route.useParams();
  const s = useCorretorSession();
  // Administrador pode escolher o corretor; corretor cria sempre em nome próprio.
  return <ProposalEditor key={id} id={id} backTo="/corretor/propostas" lockToUserId={s.isAdmin ? undefined : s.userId} compact />;
}
