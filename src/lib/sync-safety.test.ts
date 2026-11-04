import { describe, expect, it } from "vitest";
import { deactivationGate, MAX_DEACTIVATIONS_PER_RUN, ALERT_DEACTIVATIONS } from "./reconciliation.server";
import { codeAnomaly } from "./tokko-sync.server";
import { fetchTokkoProperties } from "./tokko-api.server";

describe("trava de desativação", () => {
  it("não desativa com coleta incompleta", () => expect(deactivationGate({ count: 2384, complete: false }, 2384).allow).toBe(false));
  it("não desativa abaixo de 95% da última completa", () => expect(deactivationGate({ count: 2264, complete: true }, 2384).allow).toBe(false));
  it("desativa com 95% ou mais", () => expect(deactivationGate({ count: 2265, complete: true }, 2384).allow).toBe(true));
  it("limites de 50 por execução e alerta acima de 20", () => { expect(MAX_DEACTIVATIONS_PER_RUN).toBe(50); expect(ALERT_DEACTIVATIONS).toBe(20); });
});

describe("código fora do padrão", () => {
  it("CA004420 tem dígitos demais", () => expect(codeAnomaly("CA004420")).toBe("6 dígitos depois das letras"));
  it("AP07357 está no padrão", () => expect(codeAnomaly("AP07357")).toBeNull());
  it("provisório SAP12842223 é alertado", () => expect(codeAnomaly("SAP12842223")).not.toBeNull());
});

describe("coleta da API", () => {
  it("tenta de novo a mesma página e retoma de onde parou", async () => {
    process.env.ORIGEM_API_KEY = "k";
    const offsets: string[] = []; let failed = false;
    const fake = (async (u: URL) => {
      const off = u.searchParams.get("offset")!; offsets.push(off);
      if (off === "100" && !failed) { failed = true; throw new Error("timeout"); }
      const objs = off === "0" ? Array.from({ length: 100 }, (_, i) => ({ id: i })) : [{ id: 100 }];
      return new Response(JSON.stringify({ meta: { total_count: 101 }, objects: objs }));
    }) as unknown as typeof fetch;
    const r = await fetchTokkoProperties({ fetchImpl: fake, waits: [0, 0] });
    expect(offsets).toEqual(["0", "100", "100"]);
    expect(r.properties.length).toBe(101);
    expect(r.complete).toBe(true);
  });
});
