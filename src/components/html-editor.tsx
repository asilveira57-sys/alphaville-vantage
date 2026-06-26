import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { useEffect, useRef, useState } from "react";
import { uploadEditorialImageFile } from "./image-upload";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export function HtmlEditor({ value, onChange, placeholder }: Props) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [htmlDraft, setHtmlDraft] = useState(value);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener" } }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[420px] px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep editor in sync when value resets externally (e.g. loading a page)
  useEffect(() => {
    if (!editor) return;
    if (mode === "visual" && value !== editor.getHTML()) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [value, editor, mode]);

  function toggleMode() {
    if (mode === "visual") {
      setHtmlDraft(editor?.getHTML() ?? value);
      setMode("html");
    } else {
      onChange(htmlDraft);
      editor?.commands.setContent(htmlDraft || "<p></p>", { emitUpdate: false });
      setMode("visual");
    }
  }

  async function handleImageUpload(file: File) {
    if (!editor) return;
    setUploading(true);
    try {
      const url = await uploadEditorialImageFile(file, "content");
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (e) {
      alert("Erro ao enviar imagem: " + (e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL (interna /bairros/alphaville ou externa https://...)", prev ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="border border-ink/15">
      {mode === "visual" ? (
        <>
          <Toolbar
            editor={editor}
            onImage={() => fileRef.current?.click()}
            onLink={addLink}
            onToggleHtml={toggleMode}
            uploading={uploading}
          />
          <EditorContent editor={editor} />
        </>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-ink/10 px-2 py-2 bg-ink/[0.02]">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground px-2">Modo HTML — cole/edite código</span>
            <button type="button" onClick={toggleMode}
              className="px-2.5 py-1 text-xs font-mono uppercase tracking-wider border border-ink/15 hover:bg-ink hover:text-canvas">
              Voltar ao editor
            </button>
          </div>
          <textarea
            value={htmlDraft}
            onChange={(e) => setHtmlDraft(e.target.value)}
            placeholder={placeholder ?? "<p>Cole seu HTML aqui…</p>"}
            className="w-full min-h-[420px] px-4 py-3 text-sm font-mono leading-relaxed bg-transparent focus:outline-none resize-y"
          />
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageUpload(f); }}
      />
    </div>
  );
}

function Toolbar({ editor, onImage, onLink, onToggleHtml, uploading }: {
  editor: Editor | null;
  onImage: () => void;
  onLink: () => void;
  onToggleHtml: () => void;
  uploading: boolean;
}) {
  if (!editor) return null;
  const btn = (active: boolean) =>
    `px-2.5 py-1 text-xs font-mono uppercase tracking-wider border border-ink/15 hover:bg-ink hover:text-canvas ${active ? "bg-ink text-canvas" : ""}`;

  return (
    <div className="flex flex-wrap gap-1 border-b border-ink/10 px-2 py-2 bg-ink/[0.02]">
      <button type="button" title="Parágrafo" onClick={() => editor.chain().focus().setParagraph().run()}
        className={btn(editor.isActive("paragraph"))}>P</button>
      <button type="button" title="Título 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={btn(editor.isActive("heading", { level: 1 }))}>H1</button>
      <button type="button" title="Título 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btn(editor.isActive("heading", { level: 2 }))}>H2</button>
      <button type="button" title="Título 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btn(editor.isActive("heading", { level: 3 }))}>H3</button>
      <span className="w-px bg-ink/10 mx-1" />
      <button type="button" title="Negrito" onClick={() => editor.chain().focus().toggleBold().run()}
        className={btn(editor.isActive("bold"))}><strong>B</strong></button>
      <button type="button" title="Itálico" onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btn(editor.isActive("italic"))}><em>I</em></button>
      <button type="button" title="Sublinhado" onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btn(editor.isActive("underline"))}><span className="underline">U</span></button>
      <button type="button" title="Riscado" onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btn(editor.isActive("strike"))}><s>S</s></button>
      <span className="w-px bg-ink/10 mx-1" />
      <button type="button" title="Lista" onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btn(editor.isActive("bulletList"))}>•</button>
      <button type="button" title="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btn(editor.isActive("orderedList"))}>1.</button>
      <button type="button" title="Citação" onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btn(editor.isActive("blockquote"))}>"</button>
      <button type="button" title="Linha" onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={btn(false)}>—</button>
      <span className="w-px bg-ink/10 mx-1" />
      <button type="button" title="Link" onClick={onLink} className={btn(editor.isActive("link"))}>Link</button>
      <button type="button" title="Imagem" onClick={onImage} className={btn(false)}>
        {uploading ? "…" : "Img"}
      </button>
      <span className="w-px bg-ink/10 mx-1" />
      <button type="button" title="Desfazer" onClick={() => editor.chain().focus().undo().run()} className={btn(false)}>↶</button>
      <button type="button" title="Refazer" onClick={() => editor.chain().focus().redo().run()} className={btn(false)}>↷</button>
      <span className="flex-1" />
      <button type="button" title="Editar HTML" onClick={onToggleHtml}
        className="px-2.5 py-1 text-xs font-mono uppercase tracking-wider border border-ink/15 hover:bg-ink hover:text-canvas">
        &lt;/&gt; HTML
      </button>
    </div>
  );
}
