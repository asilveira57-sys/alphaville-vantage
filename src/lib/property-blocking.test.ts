import { describe, it, expect } from "vitest";
import { isPropertyBlocked, canSyncProperty } from "./property-blocking";
describe("bloqueio administrativo", () => {
  it("bloqueado não é reativado mesmo com motivo de saída da API", () => expect(canSyncProperty({ status: "inactive", review_status: "saiu_da_api", manual_overrides: { blocked: true } })).toBe(false));
  it("bloqueio resiste a status ativo enviado por outra rotina", () => expect(canSyncProperty({ status: "active", manual_overrides: { blocked: true } })).toBe(false));
  it("reconhece o marcador administrativo", () => expect(isPropertyBlocked({ review_status: "bloqueado_manual" })).toBe(true));
  it("remoção manual como AP06222 não volta pela API", () => expect(canSyncProperty({ status: "inactive", review_status: null })).toBe(false));
  it("desbloqueado pausado pode voltar na sincronização", () => expect(canSyncProperty({ status: "paused", manual_overrides: { unblocked_at: "2026-11-11" } })).toBe(true));
});