import { sanitizeHtml } from "@/lib/sanitize-html";

export function EditorialContent({ html, className }: { html: string; className?: string }) {
  const clean = sanitizeHtml(html ?? "");
  return (
    <div
      className={
        className ??
        "prose prose-neutral max-w-none prose-headings:font-serif prose-headings:text-ink prose-h1:text-4xl md:prose-h1:text-5xl prose-h1:leading-tight prose-h2:text-2xl prose-h2:mt-12 prose-h3:text-xl prose-p:text-ink/85 prose-p:leading-relaxed prose-a:text-ink prose-a:underline prose-a:underline-offset-4 prose-strong:text-ink prose-img:my-8"
      }
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
