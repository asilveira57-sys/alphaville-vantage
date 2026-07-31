import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";

import { useEffect, useRef, useState } from "react";
import { LinkDialog } from "./editor/link-dialog";
import { ImageDialog, type ImagePayload } from "./editor/image-dialog";
import { MediaPicker } from "./media/media-picker";
import { uploadToLibrary } from "@/lib/media-upload";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** When this changes, the editor content is reset from `value`. Use the page id. */
  documentKey?: string;
  /** Pasta padrão da biblioteca de mídia para uploads feitos aqui. */
  mediaFolder?: string;
};

export function HtmlEditor({ value, onChange, placeholder, documentKey, mediaFolder = "geral" }: Props) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [htmlDraft, setHtmlDraft] = useState(value);
  const [linkOpen, setLinkOpen] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [imgInitial, setImgInitial] = useState<Partial<ImagePayload> | undefined>();
  const lastKey = useRef(documentKey);
  const lastExternalValue = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      Subscript,
      Superscript,
      Placeholder.configure({ placeholder: placeholder ?? "Comece a escrever…" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener" } }),
      Image.configure({ inline: false, allowBase64: false, HTMLAttributes: { loading: "lazy" } }),
      Table.configure({ resizable: true, HTMLAttributes: { class: "editorial-table" } }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: { class: "editorial ProseMirror min-h-[480px] px-6 py-5 focus:outline-none" },
      handlePaste: (_view, event) => {
        const files = filesFromDataTransfer(event.clipboardData);
        if (files.length === 0) return false;
        event.preventDefault();
        void uploadAndInsert(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = filesFromDataTransfer((event as DragEvent).dataTransfer);
        if (files.length === 0) return false;
        event.preventDefault();
        void uploadAndInsert(files);
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  async function uploadAndInsert(files: File[]) {
    setUploading(true);
    setUploadErr(null);
    try {
      for (const f of files) {
        const item = await uploadToLibrary(f, { folder: mediaFolder });
        editor?.chain().focus().setImage({ src: item.url, alt: item.alt_text ?? "" }).run();
      }
    } catch (e) {
      setUploadErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  // Reset content when switching pages. Also hydrate once if the editor mounted
  // before the DB value arrived, but never reset while the user is typing.
  useEffect(() => {
    if (!editor) return;
    const next = value || "<p></p>";
    const current = editor.getHTML();
    const keyChanged = lastKey.current !== documentKey;
    const loadedContentArrived =
      lastExternalValue.current !== value &&
      isEditorEmptyHtml(current) &&
      !isEditorEmptyHtml(next);

    if (keyChanged || loadedContentArrived) {
      lastKey.current = documentKey;
      editor.commands.setContent(next, { emitUpdate: false });
    }
    lastExternalValue.current = value;
  }, [documentKey, value, editor]);

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

  function openLinkDialog() {
    setLinkOpen(true);
  }

  function applyLink(url: string) {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setLinkOpen(false);
  }

  function unlink() {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
  }

  function openImageDialog(existing?: Partial<ImagePayload>) {
    setImgInitial(existing);
    setImgOpen(true);
  }

  function applyImage(p: ImagePayload) {
    if (!editor) return;
    // Insert as figure with caption when provided, otherwise standalone img.
    if (p.caption) {
      const html = `<figure><img src="${escapeAttr(p.src)}" alt="${escapeAttr(p.alt)}" loading="lazy" /><figcaption>${escapeText(p.caption)}</figcaption></figure><p></p>`;
      editor.chain().focus().insertContent(html).run();
    } else {
      editor.chain().focus().setImage({ src: p.src, alt: p.alt }).run();
    }
    setImgOpen(false);
  }

  // Ctrl/Cmd+K to open link dialog
  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openLinkDialog();
      }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [editor]);

  const initialLinkUrl = editor?.getAttributes("link").href as string | undefined;

  return (
    <div className="border border-ink/15 bg-canvas">
      {mode === "visual" ? (
        <>
          <Toolbar
            editor={editor}
            onLink={openLinkDialog}
            onImage={() => openImageDialog()}
            onMedia={() => setMediaOpen(true)}
            onToggleHtml={toggleMode}
          />
          {(uploading || uploadErr) && (
            <div className={`px-4 py-1.5 text-xs ${uploadErr ? "text-red-600" : "text-muted-foreground"}`}>
              {uploadErr ?? "Enviando imagem para a biblioteca…"}
            </div>
          )}
          <EditorContent editor={editor} />
          {editor?.isActive("table") && <TableSubmenu editor={editor} />}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-ink/10 px-3 py-2 bg-ink/[0.02]">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Modo HTML — cole/edite código</span>
            <button type="button" onClick={toggleMode}
              className="px-2.5 py-1 text-xs font-mono uppercase tracking-wider border border-ink/15 hover:bg-ink hover:text-canvas">
              Voltar ao editor
            </button>
          </div>
          <textarea
            value={htmlDraft}
            onChange={(e) => setHtmlDraft(e.target.value)}
            placeholder={placeholder ?? "<p>Cole seu HTML aqui…</p>"}
            className="w-full min-h-[480px] px-4 py-3 text-sm font-mono leading-relaxed bg-transparent focus:outline-none resize-y"
          />
        </>
      )}

      <LinkDialog
        open={linkOpen}
        initialUrl={initialLinkUrl}
        onClose={() => setLinkOpen(false)}
        onSubmit={applyLink}
        onUnlink={initialLinkUrl ? unlink : undefined}
      />
      <ImageDialog
        open={imgOpen}
        initial={imgInitial}
        onClose={() => setImgOpen(false)}
        onSubmit={applyImage}
      />
    </div>
  );
}

// ---------------- Toolbar ----------------

function Toolbar({
  editor, onLink, onImage, onToggleHtml,
}: {
  editor: Editor | null;
  onLink: () => void;
  onImage: () => void;
  onToggleHtml: () => void;
}) {
  if (!editor) return null;

  const currentBlock = editor.isActive("heading", { level: 1 }) ? "h1"
    : editor.isActive("heading", { level: 2 }) ? "h2"
    : editor.isActive("heading", { level: 3 }) ? "h3"
    : editor.isActive("heading", { level: 4 }) ? "h4"
    : editor.isActive("blockquote") ? "quote"
    : editor.isActive("codeBlock") ? "code"
    : "p";

  const btn = (active: boolean) =>
    `px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider border border-ink/15 hover:bg-ink hover:text-canvas transition ${active ? "bg-ink text-canvas" : ""}`;

  function changeBlock(v: string) {
    const chain = editor!.chain().focus();
    if (v === "p") chain.setParagraph().run();
    else if (v === "h1") chain.setHeading({ level: 1 }).run();
    else if (v === "h2") chain.setHeading({ level: 2 }).run();
    else if (v === "h3") chain.setHeading({ level: 3 }).run();
    else if (v === "h4") chain.setHeading({ level: 4 }).run();
    else if (v === "quote") chain.toggleBlockquote().run();
    else if (v === "code") chain.toggleCodeBlock().run();
  }

  return (
    <div className="flex flex-wrap gap-1 border-b border-ink/10 px-2 py-2 bg-ink/[0.02] sticky top-0 z-10">
      <select
        value={currentBlock}
        onChange={(e) => changeBlock(e.target.value)}
        className="px-2 py-1 text-xs font-mono uppercase tracking-wider border border-ink/15 bg-canvas"
        title="Estilo do bloco"
      >
        <option value="p">Parágrafo</option>
        <option value="h1">Título 1</option>
        <option value="h2">Título 2</option>
        <option value="h3">Título 3</option>
        <option value="h4">Título 4</option>
        <option value="quote">Citação</option>
        <option value="code">Bloco de código</option>
      </select>

      <Sep />

      <button type="button" title="Negrito (Ctrl+B)" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))}><strong>B</strong></button>
      <button type="button" title="Itálico (Ctrl+I)" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))}><em>I</em></button>
      <button type="button" title="Sublinhado (Ctrl+U)" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive("underline"))}><span className="underline">U</span></button>
      <button type="button" title="Riscado" onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive("strike"))}><s>S</s></button>
      <button type="button" title="Código inline" onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive("code"))}>&lt;/&gt;</button>
      <button type="button" title="Sobrescrito" onClick={() => editor.chain().focus().toggleSuperscript().run()} className={btn(editor.isActive("superscript"))}>X²</button>
      <button type="button" title="Subscrito" onClick={() => editor.chain().focus().toggleSubscript().run()} className={btn(editor.isActive("subscript"))}>X₂</button>
      <button type="button" title="Limpar formatação" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} className={btn(false)}>Tx</button>

      <Sep />

      <button type="button" title="Lista" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))}>•</button>
      <button type="button" title="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))}>1.</button>
      <button type="button" title="Checklist" onClick={() => editor.chain().focus().toggleTaskList().run()} className={btn(editor.isActive("taskList"))}>☑</button>

      <Sep />

      <button type="button" title="Alinhar à esquerda" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={btn(editor.isActive({ textAlign: "left" }))}>⇤</button>
      <button type="button" title="Centralizar" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={btn(editor.isActive({ textAlign: "center" }))}>≡</button>
      <button type="button" title="Alinhar à direita" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={btn(editor.isActive({ textAlign: "right" }))}>⇥</button>

      <Sep />

      <button type="button" title="Link (Ctrl+K)" onClick={onLink} className={btn(editor.isActive("link"))}>Link</button>
      <button type="button" title="Imagem" onClick={onImage} className={btn(false)}>Img</button>
      <button type="button" title="Inserir tabela" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={btn(false)}>Tabela</button>
      <button type="button" title="Linha horizontal" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn(false)}>—</button>

      <Sep />

      <button type="button" title="Desfazer (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} className={btn(false)}>↶</button>
      <button type="button" title="Refazer (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} className={btn(false)}>↷</button>

      <span className="flex-1" />
      <button type="button" title="Editar HTML" onClick={onToggleHtml}
        className="px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider border border-ink/15 hover:bg-ink hover:text-canvas">
        &lt;/&gt; HTML
      </button>
    </div>
  );
}

function TableSubmenu({ editor }: { editor: Editor }) {
  const act = (fn: () => void) => (e: React.MouseEvent) => { e.preventDefault(); fn(); };
  const b = "px-2 py-1 text-[11px] font-mono uppercase tracking-wider border border-ink/15 hover:bg-ink hover:text-canvas";
  return (
    <div className="flex flex-wrap gap-1 border-t border-ink/10 px-2 py-1.5 bg-ink/[0.02]">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1">Tabela</span>
      <button type="button" onClick={act(() => editor.chain().focus().addRowBefore().run())} className={b}>+ linha ↑</button>
      <button type="button" onClick={act(() => editor.chain().focus().addRowAfter().run())} className={b}>+ linha ↓</button>
      <button type="button" onClick={act(() => editor.chain().focus().addColumnBefore().run())} className={b}>+ col ←</button>
      <button type="button" onClick={act(() => editor.chain().focus().addColumnAfter().run())} className={b}>+ col →</button>
      <button type="button" onClick={act(() => editor.chain().focus().deleteRow().run())} className={b}>− linha</button>
      <button type="button" onClick={act(() => editor.chain().focus().deleteColumn().run())} className={b}>− col</button>
      <button type="button" onClick={act(() => editor.chain().focus().toggleHeaderRow().run())} className={b}>Cabeçalho</button>
      <button type="button" onClick={act(() => editor.chain().focus().mergeOrSplit().run())} className={b}>Mesclar/dividir</button>
      <button type="button" onClick={act(() => editor.chain().focus().deleteTable().run())} className={`${b} text-red-600`}>Excluir tabela</button>
    </div>
  );
}

function Sep() { return <span className="w-px bg-ink/10 mx-1" />; }

function escapeAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeText(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isEditorEmptyHtml(html: string) {
  if (/<(img|iframe|video|audio|table)\b/i.test(html)) return false;
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}
