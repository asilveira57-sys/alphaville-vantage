import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { MessageCircle, X } from "lucide-react";
import { BRAND } from "@/lib/brand";

const POS_KEY = "wa-float-pos";
const DISMISS_KEY = "wa-float-dismissed";
const SIZE = 56;
const DRAG_THRESHOLD = 6;

/** Áreas do portal em que o botão flutuante não aparece (admin/autenticação). */
const HIDDEN_PREFIXES = ["/admin", "/auth", "/audit", "/reset-password", "/area-do-parceiro"];

type Pos = { x: number; y: number };

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

function clampToViewport(x: number, y: number): Pos {
  if (typeof window === "undefined") return { x, y };
  return {
    x: clamp(x, 8, Math.max(8, window.innerWidth - SIZE - 8)),
    y: clamp(y, 8, Math.max(8, window.innerHeight - SIZE - 8)),
  };
}

export function FloatingWhatsApp() {
  const { pathname } = useLocation();
  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);
  const btnRef = useRef<HTMLAnchorElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; left: number; top: number; moved: boolean; pointerId: number } | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Pos;
        if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
          setPos(clampToViewport(parsed.x, parsed.y));
        }
      }
    } catch {
      // storage indisponível — segue com o padrão
    }
  }, []);

  // Reposiciona dentro da tela quando a janela muda de tamanho.
  useEffect(() => {
    if (!pos) return;
    const onResize = () => setPos((p) => (p ? clampToViewport(p.x, p.y) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLAnchorElement>) => {
    if (e.button !== 0) return;
    const el = btnRef.current;
    if (!el) return;
    movedRef.current = false;
    const rect = el.getBoundingClientRect();
    // Congela a posição no momento do toque para o arraste ficar suave.
    setPos({ x: rect.left, y: rect.top });
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      left: rect.left,
      top: rect.top,
      moved: false,
      pointerId: e.pointerId,
    };
    setDragging(true);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // sem pointer capture — o arraste ainda funciona
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLAnchorElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) d.moved = true;
    if (d.moved) {
      movedRef.current = true;
      setPos(clampToViewport(d.left + dx, d.top + dy));
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLAnchorElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    try {
      btnRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (d.moved) {
      setPos((p) => {
        if (p) {
          try {
            localStorage.setItem(POS_KEY, JSON.stringify(p));
          } catch {
            // ignore
          }
        }
        return p;
      });
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    // Depois de um arraste, não abre o WhatsApp.
    if (movedRef.current) {
      movedRef.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const w = window as unknown as { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void };
    const p = { method: "whatsapp", page_path: location.pathname, link_text: "botao-flutuante" };
    try { w.gtag?.("event", "whatsapp_click", p); } catch { /* */ }
    try { w.fbq?.("track", "Contact", p); } catch { /* */ }
  }, []);

  if (hidden) return null;
  if (mounted && dismissed) return null;

  // No celular, sobe acima da barra fixa de contato da página do imóvel.
  const isPropertyPage = /^\/imoveis\/.+/.test(pathname);

  return (
    <div
      className={`fixed z-[60] ${
        pos
          ? ""
          : isPropertyPage
            ? "bottom-[88px] right-5 md:bottom-5"
            : "bottom-5 right-5"
      }`}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
    >
      <div className="relative">
        {/* Fechar */}
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // ignore
            }
          }}
          aria-label="Fechar botão do WhatsApp"
          className="absolute -top-2 -right-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0D0D0D] text-white shadow-lg border border-white/25 hover:bg-[#F2DA00] hover:text-[#0D0D0D] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <a
          ref={btnRef}
          href={`https://wa.me/${BRAND.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          draggable={false}
          aria-label="Falar com a S.A Imóveis no WhatsApp"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleClick}
          data-track-self=""
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)] select-none hover:brightness-105"
          style={{ touchAction: "none", cursor: dragging ? "grabbing" : "pointer" }}
          title="Fale conosco no WhatsApp — arraste para mover"
        >
          <MessageCircle className="h-7 w-7 pointer-events-none" fill="currentColor" />
        </a>
      </div>
    </div>
  );
}
