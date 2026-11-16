import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { FileText, Home, LogOut, Plus, Users } from "lucide-react";
import logoAsset from "@/assets/logo-sa-imoveis-amarela.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { getStaffSession } from "@/lib/corretor.functions";
import { SessionCtx, type CorretorSession } from "@/components/corretor/session";

// App do Corretor (instalável como "S.A Corretor"): propostas e leads, pensado para o celular.
// Login próprio dentro de /corretor para o app nunca sair do seu escopo.

export const Route = createFileRoute("/corretor")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "S.A Corretor" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "apple-mobile-web-app-title", content: "S.A Corretor" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
  }),
  component: CorretorLayout,
});

type Session = CorretorSession;

/** Troca o manifesto e o ícone da página para os do app do corretor. */
function useCorretorManifest() {
  useEffect(() => {
    const set = (sel: string, make: () => HTMLLinkElement, href: string) => {
      let el = document.querySelector<HTMLLinkElement>(sel);
      if (!el) {
        el = make();
        document.head.appendChild(el);
      }
      const old = el.getAttribute("href");
      el.setAttribute("href", href);
      return () => old && el?.setAttribute("href", old);
    };
    const link = (rel: string) => () => {
      const l = document.createElement("link");
      l.rel = rel;
      return l;
    };
    const undo1 = set('link[rel="manifest"]', link("manifest"), "/manifest-corretor.webmanifest?v=1");
    const undo2 = set('link[rel="apple-touch-icon"]', link("apple-touch-icon"), "/icons/corretor-apple-touch.png");
    return () => {
      undo1?.();
      undo2?.();
    };
  }, []);
}

function CorretorLayout() {
  useCorretorManifest();
  const qc = useQueryClient();
  const [authState, setAuthState] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setAuthState(data.session ? "in" : "out"));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthState(session ? "in" : "out");
      qc.invalidateQueries({ queryKey: ["staffSession"] });
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const sessionFn = useServerFn(getStaffSession);
  const sessionQ = useQuery({ queryKey: ["staffSession"], queryFn: () => sessionFn(), enabled: authState === "in", staleTime: 5 * 60_000 });

  if (authState === "loading" || (authState === "in" && sessionQ.isLoading)) return <Splash />;
  if (authState === "out") return <Login />;
  if (sessionQ.error) return <Splash text={(sessionQ.error as Error).message} />;
  if (!sessionQ.data?.ok) return <NoAccess />;

  return (
    <SessionCtx.Provider value={sessionQ.data}>
      <Shell session={sessionQ.data}>
        <Outlet />
      </Shell>
    </SessionCtx.Provider>
  );
}

function Splash({ text }: { text?: string }) {
  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <img src={logoAsset.url} alt="S.A Imóveis" className="h-12 w-auto" />
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{text ?? "Carregando…"}</p>
    </div>
  );
}

function NoAccess() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col items-center justify-center gap-5 px-6 text-center">
      <img src={logoAsset.url} alt="S.A Imóveis" className="h-12 w-auto" />
      <h1 className="font-serif text-2xl">Sem acesso ao app do corretor</h1>
      <p className="text-sm text-white/60 max-w-xs">Peça ao administrador para liberar seu acesso em Equipe e acessos.</p>
      <button type="button" onClick={() => supabase.auth.signOut()} className="border border-white/30 px-5 py-3 text-xs uppercase tracking-widest">
        Sair
      </button>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message.includes("Invalid") ? "E-mail ou senha incorretos." : error.message);
  };
  const field = "w-full bg-white/5 border border-white/15 px-4 py-3.5 text-base text-white placeholder:text-white/35 focus:outline-none focus:border-[#F2DA00]";
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col justify-center px-6">
      <div className="max-w-sm w-full mx-auto">
        <img src={logoAsset.url} alt="S.A Imóveis Alphaville" className="h-12 w-auto mb-8" />
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#F2DA00] mb-2">App do corretor</p>
        <h1 className="font-serif text-3xl mb-8">Entrar</h1>
        <form onSubmit={submit} className="space-y-3">
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail" className={field} />
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className={field} />
          <button type="submit" disabled={busy} className="w-full bg-[#F2DA00] text-[#0D0D0D] py-4 text-xs uppercase tracking-widest font-semibold disabled:opacity-50">
            {busy ? "Entrando…" : "Entrar"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
        <p className="text-xs text-white/40 mt-8">Esqueceu a senha? Fale com o administrador da S.A.</p>
      </div>
    </div>
  );
}

const TABS = [
  { to: "/corretor", label: "Início", icon: Home, exact: true },
  { to: "/corretor/leads", label: "Leads", icon: Users },
  { to: "/corretor/propostas/$id", params: { id: "nova" }, label: "Nova", icon: Plus, accent: true },
  { to: "/corretor/propostas", label: "Propostas", icon: FileText },
] as const;

function Shell({ session, children }: { session: Session; children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const name = session.profile?.display_name ?? "Corretor";
  const isActive = (t: (typeof TABS)[number]) => {
    if ("exact" in t && t.exact) return pathname === t.to || pathname === `${t.to}/`;
    if (t.to === "/corretor/propostas/$id") return pathname === "/corretor/propostas/nova";
    if (t.to === "/corretor/propostas") return pathname.startsWith("/corretor/propostas") && pathname !== "/corretor/propostas/nova";
    return pathname.startsWith(t.to);
  };
  return (
    <div className="min-h-screen bg-canvas pb-20">
      <header className="sticky top-0 z-40 bg-[#0D0D0D] text-white" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="h-14 px-4 flex items-center justify-between">
          <Link to="/corretor" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="S.A" className="h-8 w-auto" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#F2DA00]">Corretor</span>
          </Link>
          <div className="flex items-center gap-3">
            {session.profile?.photo_url ? (
              <img src={session.profile.photo_url} alt={name} className="h-8 w-8 rounded-full object-cover border border-[#F2DA00]" />
            ) : (
              <span className="text-xs text-white/70">{name.split(" ")[0]}</span>
            )}
            <button type="button" aria-label="Sair" onClick={() => supabase.auth.signOut()} className="text-white/60 hover:text-white">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <nav
        className="fixed bottom-0 inset-x-0 z-50 bg-[#0D0D0D] border-t border-white/10 grid grid-cols-4"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Menu do app"
      >
        {TABS.map((t) => {
          const on = isActive(t);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              params={"params" in t ? t.params : undefined}
              className={`h-16 flex flex-col items-center justify-center gap-1 text-[10px] uppercase tracking-widest ${
                "accent" in t && t.accent ? "text-[#0D0D0D]" : on ? "text-[#F2DA00]" : "text-white/60"
              }`}
            >
              {"accent" in t && t.accent ? (
                <span className="h-9 w-9 rounded-full bg-[#F2DA00] flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </span>
              ) : (
                <Icon className="h-5 w-5" />
              )}
              <span className={"accent" in t && t.accent ? "text-white/80" : ""}>{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
