import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { SiteLayout } from "@/components/site-layout";
import { AdminGate, AdminPageHeader } from "@/components/admin/admin-gate";
import { createTeamMember, listTeam, removeTeamMember, setTeamMemberPassword, type TeamMember } from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/admin-equipe")({
  head: () => ({ meta: [{ title: "Admin · Equipe e acessos — Portal S.A" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (
    <AdminGate>
      <EquipePage />
    </AdminGate>
  ),
});

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "nunca");

function EquipePage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTeam);
  const createFn = useServerFn(createTeamMember);
  const teamQ = useQuery({ queryKey: ["adminTeam"], queryFn: () => listFn() });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const createMut = useMutation({
    mutationFn: () => createFn({ data: { name, email, password } }),
    onSuccess: () => {
      setName("");
      setEmail("");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["adminTeam"] });
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    createMut.mutate();
  };

  return (
    <SiteLayout>
      <div className="max-w-5xl mx-auto px-6 py-14">
        <AdminPageHeader eyebrow="Sistema" title="Equipe e acessos" />

        <section className="border border-ink/10 bg-white/40 p-6 mb-12 max-w-2xl">
          <h2 className="font-serif text-2xl text-ink mb-1">Cadastrar colaborador</h2>
          <p className="text-xs text-muted-foreground mb-5">
            O colaborador tem acesso total ao admin. Defina uma senha provisória e passe para ele; ele entra em
            /auth com o e-mail e essa senha.
          </p>
          <form onSubmit={submit} className="space-y-3">
            <input
              value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nome (ex.: João Carvalho)"
              className="w-full border border-ink/15 px-4 py-3 text-sm bg-transparent focus:outline-none focus:border-ink"
            />
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="E-mail"
              autoComplete="off"
              className="w-full border border-ink/15 px-4 py-3 text-sm bg-transparent focus:outline-none focus:border-ink"
            />
            <div className="flex gap-2">
              <input
                type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={8} placeholder="Senha provisória (mín. 8 caracteres)" autoComplete="new-password"
                className="flex-1 border border-ink/15 px-4 py-3 text-sm bg-transparent focus:outline-none focus:border-ink"
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="border border-ink/15 px-3 text-xs uppercase tracking-widest">
                {show ? "Ocultar" : "Ver"}
              </button>
            </div>
            <button
              type="submit" disabled={createMut.isPending}
              className="bg-ink text-canvas px-5 py-3 text-xs uppercase tracking-widest font-medium hover:bg-ink/85 disabled:opacity-50"
            >
              {createMut.isPending ? "Cadastrando…" : "Cadastrar com acesso total"}
            </button>
            {createMut.error && <p className="text-xs text-red-600">{(createMut.error as Error).message}</p>}
            {createMut.data && (
              <p className="text-xs text-emerald-700">
                {createMut.data.existed
                  ? "Essa pessoa já tinha conta no portal. O acesso ao admin foi liberado e a senha antiga dela continua valendo. Se precisar, use “Trocar senha” na lista."
                  : "Colaborador cadastrado. Passe o e-mail e a senha provisória para ele."}
              </p>
            )}
          </form>
        </section>

        <h2 className="font-serif text-2xl text-ink mb-4">Quem tem acesso ao admin</h2>
        {teamQ.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {teamQ.error && <p className="text-sm text-red-600">{(teamQ.error as Error).message}</p>}
        <div className="border border-ink/10">
          {(teamQ.data ?? []).map((m) => <MemberRow key={m.userId} m={m} />)}
          {teamQ.data?.length === 0 && <div className="px-4 py-8 text-sm text-muted-foreground text-center">Ninguém cadastrado.</div>}
        </div>
      </div>
    </SiteLayout>
  );
}

function MemberRow({ m }: { m: TeamMember }) {
  const qc = useQueryClient();
  const removeFn = useServerFn(removeTeamMember);
  const pwdFn = useServerFn(setTeamMemberPassword);
  const [editing, setEditing] = useState(false);
  const [pwd, setPwd] = useState("");

  const removeMut = useMutation({
    mutationFn: () => removeFn({ data: { userId: m.userId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminTeam"] }),
  });
  const pwdMut = useMutation({
    mutationFn: () => pwdFn({ data: { userId: m.userId, password: pwd } }),
    onSuccess: () => {
      setPwd("");
      setEditing(false);
    },
  });

  return (
    <div className="px-4 py-3 border-b border-ink/8 text-sm">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="font-medium text-ink">
            {m.name ?? m.email} {m.isSelf && <span className="text-[10px] uppercase tracking-widest text-muted-foreground ml-1">(você)</span>}
          </div>
          <div className="text-xs text-muted-foreground">{m.email}</div>
        </div>
        <div className="text-xs text-muted-foreground w-44">Último acesso: {fmt(m.lastSignInAt)}</div>
        <div className="flex gap-2">
          <button
            type="button" onClick={() => setEditing((v) => !v)}
            className="border border-ink/20 px-3 py-1.5 text-[11px] uppercase tracking-widest hover:bg-ink/5"
          >
            Trocar senha
          </button>
          {!m.isSelf && (
            <button
              type="button" disabled={removeMut.isPending}
              onClick={() => {
                if (window.confirm(`Tirar o acesso de ${m.name ?? m.email} ao admin? A conta continua existindo.`)) removeMut.mutate();
              }}
              className="border border-red-300 text-red-700 px-3 py-1.5 text-[11px] uppercase tracking-widest hover:bg-red-50 disabled:opacity-50"
            >
              {removeMut.isPending ? "Tirando…" : "Tirar acesso"}
            </button>
          )}
        </div>
      </div>
      {editing && (
        <form
          onSubmit={(e) => { e.preventDefault(); pwdMut.mutate(); }}
          className="mt-3 flex gap-2 max-w-lg"
        >
          <input
            type="text" value={pwd} onChange={(e) => setPwd(e.target.value)} minLength={8} required
            placeholder="Nova senha (mín. 8 caracteres)" autoComplete="new-password"
            className="flex-1 border border-ink/15 px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-ink"
          />
          <button type="submit" disabled={pwdMut.isPending} className="bg-ink text-canvas px-4 py-2 text-[11px] uppercase tracking-widest disabled:opacity-50">
            {pwdMut.isPending ? "Salvando…" : "Salvar"}
          </button>
        </form>
      )}
      {pwdMut.isSuccess && <p className="mt-2 text-xs text-emerald-700">Senha trocada.</p>}
      {(removeMut.error || pwdMut.error) && (
        <p className="mt-2 text-xs text-red-600">{((removeMut.error || pwdMut.error) as Error).message}</p>
      )}
    </div>
  );
}
