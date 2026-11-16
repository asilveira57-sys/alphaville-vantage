import { createContext, useContext } from "react";
import type { getStaffSession } from "@/lib/corretor.functions";

export type CorretorSession = Extract<Awaited<ReturnType<typeof getStaffSession>>, { ok: true }>;
export const SessionCtx = createContext<CorretorSession | null>(null);

export function useCorretorSession(): CorretorSession {
  const s = useContext(SessionCtx);
  if (!s) throw new Error("Sessão do corretor ausente");
  return s;
}
