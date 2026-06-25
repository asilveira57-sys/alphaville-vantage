import { useRef } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

const BUTTONS: { label: string; wrap?: [string, string]; insert?: string; title: string }[] = [
  { label: "H1", wrap: ["<h1>", "</h1>"], title: "Título principal" },
  { label: "H2", wrap: ["<h2>", "</h2>"], title: "Subtítulo" },
  { label: "H3", wrap: ["<h3>", "</h3>"], title: "Subtítulo menor" },
  { label: "B", wrap: ["<strong>", "</strong>"], title: "Negrito" },
  { label: "I", wrap: ["<em>", "</em>"], title: "Itálico" },
  { label: "•", wrap: ["<ul>\n  <li>", "</li>\n</ul>"], title: "Lista" },
  { label: "1.", wrap: ["<ol>\n  <li>", "</li>\n</ol>"], title: "Lista numerada" },
  { label: "P", wrap: ["<p>", "</p>"], title: "Parágrafo" },
];

export function HtmlEditor({ value, onChange, placeholder }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  function applyAt(before: string, after: string) {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = ta.value.slice(start, end);
    const next = ta.value.slice(0, start) + before + sel + after + ta.value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, end + before.length);
    });
  }

  function insertLink() {
    const url = window.prompt("URL (interna ex: /condominios/residencial-1 ou externa https://...)");
    if (!url) return;
    const ta = taRef.current;
    if (!ta) return;
    const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd) || url;
    applyAt(`<a href="${url}">`, `</a>`);
    void sel;
  }

  function insertImage() {
    const url = window.prompt("URL da imagem");
    if (!url) return;
    const alt = window.prompt("Texto alternativo (alt)") ?? "";
    applyAt(`<img src="${url}" alt="${alt}" />`, "");
  }

  return (
    <div className="border border-ink/15">
      <div className="flex flex-wrap gap-1 border-b border-ink/10 px-2 py-2 bg-ink/[0.02]">
        {BUTTONS.map((b) => (
          <button
            key={b.label}
            type="button"
            title={b.title}
            onClick={() => b.wrap && applyAt(b.wrap[0], b.wrap[1])}
            className="px-2.5 py-1 text-xs font-mono uppercase tracking-wider border border-ink/15 hover:bg-ink hover:text-canvas"
          >
            {b.label}
          </button>
        ))}
        <button type="button" onClick={insertLink} title="Inserir link"
          className="px-2.5 py-1 text-xs font-mono uppercase tracking-wider border border-ink/15 hover:bg-ink hover:text-canvas">
          Link
        </button>
        <button type="button" onClick={insertImage} title="Inserir imagem"
          className="px-2.5 py-1 text-xs font-mono uppercase tracking-wider border border-ink/15 hover:bg-ink hover:text-canvas">
          Img
        </button>
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Escreva o conteúdo HTML…"}
        className="w-full min-h-[420px] px-4 py-3 text-sm font-mono leading-relaxed bg-transparent focus:outline-none resize-y"
      />
    </div>
  );
}
