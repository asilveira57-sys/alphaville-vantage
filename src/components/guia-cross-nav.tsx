import { Link } from "@tanstack/react-router";

const ALL = [
  { to: "/guia-alphaville", title: "Alphaville" },
  { to: "/guia-tambore", title: "Tamboré" },
  { to: "/guia-barueri", title: "Barueri" },
  { to: "/guia-santana-de-parnaiba", title: "Santana de Parnaíba" },
] as const;

export function GuiaCrossNav({ currentTo }: { currentTo: string }) {
  const others = ALL.filter((g) => g.to !== currentTo);
  return (
    <section className="px-6 py-16 border-t border-ink/8 bg-ink/[0.02]">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <h2 className="font-serif text-2xl md:text-3xl">Explore outros guias</h2>
          <Link to="/guia" className="text-[11px] uppercase tracking-[0.2em] hover:underline">Ver todos os guias →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {others.map((g) => (
            <Link key={g.to} to={g.to} className="group block border-t border-ink/10 pt-6">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Guia Regional</p>
              <h3 className="font-serif text-xl group-hover:underline">{g.title}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
