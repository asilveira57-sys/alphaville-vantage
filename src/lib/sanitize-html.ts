// Lightweight HTML sanitizer (defense-in-depth) — isomorphic, no deps.
// Removes <script>, <style>, <iframe>, on* handlers, and javascript: URLs.
// Trusted admin-only input; this is a safety net, not a primary defense.

const FORBIDDEN_TAGS = /<\/?(script|style|iframe|object|embed|form|input|button|meta|link|base)\b[^>]*>/gi;
const ON_ATTRS = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_HREF = /\s+(href|src|action|formaction|xlink:href)\s*=\s*(["'])\s*(?:javascript|data|vbscript):[^"']*\2/gi;
const SRCDOC = /\s+srcdoc\s*=\s*(["'])[^"']*\1/gi;

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return stripChatCitations(html)
    .replace(FORBIDDEN_TAGS, "")
    .replace(ON_ATTRS, "")
    .replace(JS_HREF, "")
    .replace(SRCDOC, "");
}

// --- ChatGPT citation artifacts ---
// Removes leftover citation marks from AI-generated text:
// :contentReference[oaicite:N]{index=N}, [oaicite:N], 【N†...】, citeturn/turn0search/
// turn0news/filecite tokens, the invisible chars U+E200–U+E206 that wrap them, and
// the utm_source=chatgpt.com tracking parameter in links (the link itself is kept).

const CHAT_CITATION_PATTERNS: RegExp[] = [
  /:{1,2}contentReference\[oaicite:\d+\]\{index=\d+\}/g,
  /\[oaicite:\d+\]/g,
  /【[^】]*】/g,
  /(?:cite|filecite)?turn\d+(?:search|news|image|file)\d*/g,
  /[-]/g,
];

export function stripChatCitations(text: string): string {
  if (!text) return text;
  let out = text.replace(/([?&])utm_source=chatgpt\.com(&|$)/g, (_m, sep, tail) =>
    tail === "&" ? sep : "",
  );
  for (const re of CHAT_CITATION_PATTERNS) out = out.replace(re, "");
  // Remove o espaço que sobra antes da pontuação quando a marca era precedida de espaço.
  out = out.replace(/ +([.,;:!?)\]])/g, "$1");
  return out;
}

/** Aplica stripChatCitations em todas as strings de um objeto/array (para payloads do CMS). */
export function stripChatCitationsDeep<T>(value: T): T {
  if (typeof value === "string") return stripChatCitations(value) as T;
  if (Array.isArray(value)) return value.map((v) => stripChatCitationsDeep(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = stripChatCitationsDeep(v);
    }
    return out as T;
  }
  return value;
}

export function htmlToPlainText(html: string): string {
  return sanitizeHtml(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(html: string): number {
  const t = htmlToPlainText(html);
  return t ? t.split(/\s+/).length : 0;
}

export function hasH1(html: string): boolean {
  return /<h1\b/i.test(html);
}

export function hasInternalLink(html: string): boolean {
  return /<a\b[^>]*\shref\s*=\s*["']\/[^"']*["']/i.test(html);
}
