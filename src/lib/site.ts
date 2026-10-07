// Domínio oficial do portal — única fonte de verdade para URLs absolutas
// (canonical, og:url, JSON-LD, sitemap, IndexNow, robots).
export const SITE_URL = "https://portal.saimoveisalpha.com.br";
export const SITE_HOST = "portal.saimoveisalpha.com.br";

// Domínios secundários: toda requisição recebe 301 para SITE_URL mantendo caminho e query.
export const LEGACY_HOSTS = ["portal.saimoveisalphaville.com.br"];
