import { sanitizeHtml } from "@/lib/sanitize-html";

export function EditorialContent({ html, className }: { html: string; className?: string }) {
  const clean = sanitizeHtml(html ?? "");
  return (
    <div
      className={className ? `editorial ${className}` : "editorial"}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
