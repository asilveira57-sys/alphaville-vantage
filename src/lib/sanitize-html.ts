// Lightweight HTML sanitizer (defense-in-depth) — isomorphic, no deps.
// Removes <script>, <style>, <iframe>, on* handlers, and javascript: URLs.
// Trusted admin-only input; this is a safety net, not a primary defense.

const FORBIDDEN_TAGS = /<\/?(script|style|iframe|object|embed|form|input|button|meta|link|base)\b[^>]*>/gi;
const ON_ATTRS = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_HREF = /\s+(href|src|action|formaction|xlink:href)\s*=\s*(["'])\s*(?:javascript|data|vbscript):[^"']*\2/gi;
const SRCDOC = /\s+srcdoc\s*=\s*(["'])[^"']*\1/gi;

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(FORBIDDEN_TAGS, "")
    .replace(ON_ATTRS, "")
    .replace(JS_HREF, "")
    .replace(SRCDOC, "");
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
