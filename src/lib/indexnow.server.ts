// IndexNow client — server only.
// Docs: https://www.indexnow.org/documentation
// Notifies Bing (and IndexNow partners) about URL changes so they can recrawl faster.
// Google no longer accepts IndexNow but respects the sitemap; this is for Bing/Yandex/etc.

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";

export interface IndexNowResult {
  ok: boolean;
  status: number;
  error?: string;
  urlsSent: number;
}

/**
 * Notifica o IndexNow (Bing / Yandex / Naver / Seznam) sobre URLs atualizadas.
 * Retorna { ok, status } — nunca lança, para uso fire-and-forget.
 */
export async function submitIndexNow(
  host: string,
  urls: string[],
): Promise<IndexNowResult> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return { ok: false, status: 0, error: "INDEXNOW_KEY ausente", urlsSent: 0 };
  if (!urls.length) return { ok: true, status: 200, urlsSent: 0 };

  // limite prático de payload; se passar, quebra em lotes de 10k (API aceita até 10k por request)
  const batches: string[][] = [];
  const CHUNK = 5000;
  for (let i = 0; i < urls.length; i += CHUNK) batches.push(urls.slice(i, i + CHUNK));

  let lastStatus = 0;
  let firstError: string | undefined;
  let sent = 0;

  const keyLocation = `https://${host}/api/public/indexnow-key.txt`;

  for (const batch of batches) {
    try {
      const resp = await fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host,
          key,
          keyLocation,
          urlList: batch,
        }),
      });
      lastStatus = resp.status;
      sent += batch.length;
      // 200 OK, 202 Accepted são sucesso. 4xx são erro.
      if (!resp.ok && resp.status !== 202) {
        const text = await resp.text().catch(() => "");
        firstError = firstError ?? `HTTP ${resp.status}: ${text.slice(0, 200)}`;
      }
    } catch (e) {
      firstError = firstError ?? (e instanceof Error ? e.message : String(e));
    }
  }

  return {
    ok: !firstError,
    status: lastStatus,
    error: firstError,
    urlsSent: sent,
  };
}
