import type { TokkoProperty } from './importers/tokko';

const ENDPOINT = 'https://www.tokkobroker.com/api/v1/property/';
/** Tempo máximo de cada página (a API costuma responder em 1–3 s). */
export const PAGE_TIMEOUT_MS = 25000;
/** Esperas entre novas tentativas da MESMA página (retoma de onde parou). */
export const RETRY_WAITS_MS = [3000, 10000, 30000];

export type TokkoFetchResult = {
  properties: TokkoProperty[];
  /** total_count informado pela API. */
  expected: number;
  /** true só quando todas as páginas vieram e o total não mudou no meio da coleta. */
  complete: boolean;
  retries: number;
  note?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch all pages with fixed origin. Provider pagination URLs may contain credentials: never log them. */
export async function fetchTokkoProperties(opts: { deadline?: number; fetchImpl?: typeof fetch; waits?: number[] } = {}): Promise<TokkoFetchResult> {
  const key = process.env['ORIGEM_API_KEY'];
  if (!key) throw new Error('ORIGEM_API_KEY não configurado');
  const doFetch = opts.fetchImpl ?? fetch;
  const waits = opts.waits ?? RETRY_WAITS_MS;
  const properties: TokkoProperty[] = [];
  let offset = 0; let expected: number | undefined; let retries = 0; let complete = true; let note: string | undefined;

  const page = async (off: number) => {
    let last = '';
    for (let attempt = 0; attempt <= waits.length; attempt++) {
      if (attempt) { retries++; await sleep(waits[attempt - 1]); }
      if (opts.deadline && Date.now() > opts.deadline) throw new Error(`Tokko: tempo total esgotado na página offset=${off}`);
      const url = new URL(ENDPOINT);
      for (const [k, v] of Object.entries({ key, format: 'json', lang: 'pt_BR', limit: '100', offset: String(off) })) url.searchParams.set(k, v);
      try {
        const response = await doFetch(url, { signal: AbortSignal.timeout(PAGE_TIMEOUT_MS) });
        if (!response.ok) {
          const body = (await response.text()).split(key).join('[redigido]');
          last = `Tokko HTTP ${response.status}: ${body.slice(0, 300)}`;
          if (response.status < 500 && response.status !== 429) throw new Error(last);
          continue;
        }
        const data = await response.json() as { meta?: { total_count?: number }; objects?: TokkoProperty[] };
        if (!Array.isArray(data.objects) || typeof data.meta?.total_count !== 'number') { last = 'Tokko: resposta inválida'; continue; }
        return data as { meta: { total_count: number }; objects: TokkoProperty[] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.startsWith('Tokko HTTP 4')) throw e;
        last = `Tokko: falha de conexão ou tempo limite (${PAGE_TIMEOUT_MS / 1000}s)`;
      }
    }
    throw new Error(`${last} — página offset=${off}, ${waits.length + 1} tentativas`);
  };

  while (expected === undefined || offset < expected) {
    const data = await page(offset);
    if (expected !== undefined && expected !== data.meta.total_count) {
      complete = false; note = `total mudou durante a coleta (${expected} → ${data.meta.total_count})`;
    }
    expected = expected ?? data.meta.total_count;
    if (!data.objects.length) { if (offset < expected) { complete = false; note = 'paginação incompleta'; } break; }
    properties.push(...data.objects); offset += data.objects.length;
    if (offset > 100000) throw new Error('Tokko: limite de segurança de paginação');
  }
  const uniq = new Map(properties.map((p) => [p.id, p]));
  if (uniq.size !== properties.length) { complete = false; note = 'IDs repetidos durante a paginação'; }
  if (uniq.size < (expected ?? 0)) complete = false;
  return { properties: [...uniq.values()], expected: expected ?? 0, complete, retries, note };
}
