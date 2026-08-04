// Utilitário para contornar o limite de 1000 linhas por requisição da Data API.
// Pagina automaticamente até trazer TODOS os registros da consulta.

const CHUNK = 1000;

export async function fetchAllRows<T>(
  makeQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  chunk = CHUNK,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  // Limite de segurança para evitar loop infinito (500k registros).
  for (let i = 0; i < 500; i++) {
    const { data, error } = await makeQuery(from, from + chunk - 1);
    if (error) throw new Error((error as { message?: string })?.message ?? "Erro na consulta");
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < chunk) break;
    from += chunk;
  }
  return all;
}
