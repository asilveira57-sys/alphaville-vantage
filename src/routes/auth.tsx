import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso restrito — S.A Imóveis Alphaville" },
      { name: "description", content: "Área restrita da equipe editorial da S.A Imóveis Alphaville." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "recover">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "recover") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice("Se este e-mail tiver acesso, enviamos um link de redefinição.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error("Credenciais inválidas ou acesso não autorizado.");
        navigate({ to: "/admin" });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SiteLayout>
      <div className="max-w-md mx-auto px-6 py-24">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">
          Acesso restrito — equipe interna
        </p>
        <h1 className="font-serif text-4xl font-medium text-ink mb-3">
          {mode === "signin" ? "Entrar" : "Redefinir senha"}
        </h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          Esta área é exclusiva para administradores. Não há cadastro público — o acesso é
          criado internamente pela administração do portal.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            required
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="w-full border border-ink/15 px-4 py-3 text-sm bg-transparent focus:outline-none focus:border-ink"
          />
          {mode === "signin" && (
            <input
              required
              type="password"
              minLength={8}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              className="w-full border border-ink/15 px-4 py-3 text-sm bg-transparent focus:outline-none focus:border-ink"
            />
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          {notice && <p className="text-xs text-emerald-700">{notice}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-canvas px-5 py-3 text-xs uppercase tracking-widest font-medium hover:bg-ink/85 disabled:opacity-50"
          >
            {loading ? "Aguarde…" : mode === "signin" ? "Entrar" : "Enviar link de redefinição"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "recover" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="mt-6 text-xs uppercase tracking-widest text-muted-foreground hover:text-ink"
        >
          {mode === "signin" ? "Esqueci minha senha" : "Voltar para o login"}
        </button>
      </div>
    </SiteLayout>
  );
}
