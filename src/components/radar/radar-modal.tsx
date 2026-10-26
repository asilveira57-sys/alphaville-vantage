import { RadarFlow } from "./radar-flow";

// Janela do Radar (atalho). Toda a lógica vive em RadarFlow.
export function RadarModal({ open, onClose, initialInterest }: { open: boolean; onClose: () => void; initialInterest?: string }) {
  if (!open) return null;
  return <RadarFlow variant="modal" onClose={onClose} initialInterest={initialInterest} />;
}
