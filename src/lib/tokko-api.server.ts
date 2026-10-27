import type { TokkoProperty } from './importers/tokko';

const ENDPOINT = 'https://www.tokkobroker.com/api/v1/property/';
/** Fetch all pages with fixed origin. Provider pagination URLs may contain credentials: never log them. */
export async function fetchTokkoProperties(): Promise<TokkoProperty[]> {
  const key = process.env['ORIGEM_API_KEY'];
  if (!key) throw new Error('ORIGEM_API_KEY não configurado');
  const properties: TokkoProperty[] = [];
  let offset = 0; let expected: number | undefined;
  while (expected === undefined || offset < expected) {
    const url = new URL(ENDPOINT);
    for (const [k, v] of Object.entries({ key, format: 'json', lang: 'pt_BR', limit: '200', offset: String(offset) })) url.searchParams.set(k, v);
    let response: Response;
    try { response = await fetch(url, { signal: AbortSignal.timeout(45000), cache: 'no-store' }); }
    catch { throw new Error('Tokko: falha de conexão ou tempo limite'); }
    if (!response.ok) {
      const body = (await response.text()).split(key).join('[redigido]');
      throw new Error(`Tokko HTTP ${response.status}: ${body.slice(0, 2000)}`);
    }
    const data = await response.json() as { meta?: { total_count?: number; next?: string | null }; objects?: TokkoProperty[] };
    if (!Array.isArray(data.objects) || typeof data.meta?.total_count !== 'number') throw new Error('Tokko: resposta inválida');
    if (expected !== undefined && expected !== data.meta.total_count) throw new Error('Tokko: total mudou durante a coleta; refaça a simulação');
    expected = data.meta.total_count;
    if (!data.objects.length && offset < expected) throw new Error('Tokko: paginação incompleta');
    properties.push(...data.objects); offset += data.objects.length;
    if (offset > 100000) throw new Error('Tokko: limite de segurança de paginação');
  }
  if (new Set(properties.map(p => p.id)).size !== properties.length) throw new Error('Tokko: IDs repetidos durante paginação');
  return properties;
}