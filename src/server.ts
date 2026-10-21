import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { SITE_URL, LEGACY_HOSTS } from "./lib/site";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// Páginas e áreas com conteúdo por usuário nunca levam cache de borda.
const NO_CACHE_PREFIXES = [
  "/admin",
  "/cms",
  "/auth",
  "/audit",
  "/area-do-parceiro",
  "/reset-password",
  "/api",
  "/lovable",
];

// Cache-Control das respostas públicas: HTML curto com stale-while-revalidate
// (a borda serve a página guardada enquanto busca uma nova) e arquivos
// estáticos com hash no nome (/assets/) com cache longo e imutável.
function withCacheHeaders(request: Request, response: Response): Response {
  if (request.method !== "GET" && request.method !== "HEAD") return response;
  if (response.status !== 200 || response.headers.has("set-cookie")) return response;
  if (response.headers.has("cache-control")) return response;

  const path = new URL(request.url).pathname;
  let value: string | null = null;
  if (path.startsWith("/assets/") || path === "/favicon.png") {
    value = "public, max-age=31536000, immutable";
  } else if (
    !NO_CACHE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`)) &&
    (response.headers.get("content-type") ?? "").includes("text/html")
  ) {
    value = "public, max-age=60, stale-while-revalidate=300";
  }
  if (!value) return response;

  const res = new Response(response.body, response);
  res.headers.set("Cache-Control", value);
  return res;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    if (LEGACY_HOSTS.includes(url.hostname.toLowerCase())) {
      return new Response(null, {
        status: 301,
        headers: { location: `${SITE_URL}${url.pathname}${url.search}` },
      });
    }
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withCacheHeaders(request, await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
