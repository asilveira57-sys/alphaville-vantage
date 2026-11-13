import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, LayoutDashboard, LogOut, Menu, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/admin.functions";
import { ADMIN_HOME, ADMIN_NAV, isAdminPath, isItemActive, type AdminNavGroup } from "@/lib/admin-nav";

const OPEN_KEY = "sa-admin-nav-open";

function readOpen(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(OPEN_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Barra lateral do admin. Envolve todas as rotas autenticadas; só aparece em
 * rotas de admin (/admin*, /cms*, /audit*) e só para quem é administrador.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onAdmin = isAdminPath(pathname);
  const checkFn = useServerFn(checkIsAdmin);
  const adminQ = useQuery({
    queryKey: ["isAdmin"],
    queryFn: () => checkFn(),
    enabled: onAdmin,
    staleTime: 5 * 60_000,
  });

  if (!onAdmin || !adminQ.data?.isAdmin) return <>{children}</>;

  return (
    <div className="lg:flex min-h-screen bg-canvas">
      <AdminSidebar pathname={pathname} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function AdminSidebar({ pathname }: { pathname: string }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => setOpen(readOpen()), []);
  useEffect(() => setMobileOpen(false), [pathname]);

  // Atalho Ctrl+K / Cmd+K para buscar no menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMobileOpen(true);
        document.getElementById("admin-nav-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups: AdminNavGroup[] = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return ADMIN_NAV;
    return ADMIN_NAV.map((g) => ({
      ...g,
      items: g.items.filter((i) => norm(`${i.label} ${i.description} ${g.label}`).includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const exact = ADMIN_NAV.flatMap((g) => g.items).some((i) => i.to === pathname);
  const active = (to: string, match?: string[]) =>
    exact ? pathname === to : isItemActive({ to, match, label: "", description: "" }, pathname);
  const groupHasActive = (g: AdminNavGroup) => g.items.some((i) => active(i.to, i.match));

  const toggle = (id: string, current: boolean) => {
    const next = { ...open, [id]: !current };
    setOpen(next);
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(next));
    } catch {
      /* sem armazenamento: só não lembra */
    }
  };

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  const nav = (
    <nav className="flex flex-col h-full" aria-label="Menu do admin">
      <div className="px-4 pt-5 pb-3 border-b border-white/10">
        <Link to="/" className="block text-[10px] uppercase tracking-[0.25em] text-white/50 hover:text-white">
          ← Ver o portal
        </Link>
        <p className="mt-2 font-serif text-xl text-white">Admin S.A</p>
        <div className="mt-3 flex items-center gap-2 bg-white/5 border border-white/10 px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-white/40 shrink-0" />
          <input
            id="admin-nav-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no menu (Ctrl+K)"
            className="w-full bg-transparent text-xs text-white placeholder:text-white/35 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <Link
          to={ADMIN_HOME}
          className={`mx-2 flex items-center gap-2 px-3 py-2 text-sm ${
            pathname === ADMIN_HOME ? "bg-[#F2DA00] text-[#0D0D0D] font-medium" : "text-white/80 hover:bg-white/5 hover:text-white"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" /> Início
        </Link>

        {groups.map((g) => {
          const isOpen = query ? true : (open[g.id] ?? groupHasActive(g));
          return (
            <div key={g.id} className="mt-2">
              <button
                type="button"
                onClick={() => toggle(g.id, isOpen)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between px-5 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/45 hover:text-white/80"
              >
                {g.label}
                <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
              </button>
              {isOpen && (
                <ul className="mt-0.5">
                  {g.items.map((i) => {
                    const on = active(i.to, i.match);
                    return (
                      <li key={i.to}>
                        <Link
                          to={i.to}
                          title={i.description}
                          className={`mx-2 block px-3 py-1.5 text-[13px] leading-snug ${
                            on ? "bg-white/10 text-[#F2DA00] font-medium" : "text-white/75 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          {i.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
        {groups.length === 0 && <p className="px-5 py-4 text-xs text-white/50">Nada encontrado.</p>}
      </div>

      <button
        type="button"
        onClick={signOut}
        className="m-3 flex items-center justify-center gap-2 border border-white/15 px-3 py-2 text-[11px] uppercase tracking-widest text-white/70 hover:text-white hover:border-white/40"
      >
        <LogOut className="h-3.5 w-3.5" /> Sair
      </button>
    </nav>
  );

  return (
    <>
      {/* Celular e tablet: barra no topo com botão do menu */}
      <div className="lg:hidden sticky top-0 z-50 flex items-center justify-between bg-[#0D0D0D] px-4 py-2.5">
        <span className="font-serif text-white">Admin S.A</span>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-white"
        >
          <Menu className="h-4 w-4" /> Menu
        </button>
      </div>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[70] flex">
          <div className="w-72 max-w-[85vw] h-full bg-[#0D0D0D] relative">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-4 text-white/70 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            {nav}
          </div>
          <button type="button" aria-label="Fechar menu" className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Computador: barra lateral fixa */}
      <aside className="hidden lg:block w-64 shrink-0 bg-[#0D0D0D] sticky top-0 h-screen">{nav}</aside>
    </>
  );
}
