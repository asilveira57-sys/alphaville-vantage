import { useQuery } from "@tanstack/react-query";
import { listActiveCtas } from "@/lib/cta.functions";

type Props = {
  contentType: string;
  ctaId: string | null;
  hidden: boolean;
  onChange: (patch: { ctaId?: string | null; hidden?: boolean }) => void;
};

/**
 * Seletor de CTA reutilizável para os editores do CMS.
 * Hierarquia: CTA escolhido aqui → padrão do tipo de conteúdo → CTA geral → nenhum.
 */
export function CtaSelector({ contentType, ctaId, hidden, onChange }: Props) {
  const { data: ctas } = useQuery({
    queryKey: ["ctas", "active"],
    queryFn: () => listActiveCtas(),
    staleTime: 60_000,
  });

  const options = (ctas ?? []).filter(
    (c: any) =>
      !Array.isArray(c.allowed_content_types) ||
      c.allowed_content_types.length === 0 ||
      c.allowed_content_types.includes(contentType),
  );

  return (
    <section className="space-y-3 border-t border-ink/10 pt-6">
      <h3 className="text-sm font-medium text-ink">Bloco de CTA</h3>
      <p className="text-xs text-muted-foreground">
        Escolha um CTA da biblioteca central. Se deixar em “Padrão”, será usado o CTA padrão do tipo de
        conteúdo (ou o CTA geral do site).
      </p>
      <select
        value={ctaId ?? ""}
        onChange={(e) => onChange({ ctaId: e.target.value || null })}
        disabled={hidden}
        className="w-full h-10 border border-ink/15 bg-transparent px-3 text-sm disabled:opacity-50"
      >
        <option value="">Padrão (automático)</option>
        {options.map((c: any) => (
          <option key={c.id} value={c.id}>
            {c.internal_name} — {c.title}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={hidden}
          onChange={(e) => onChange({ hidden: e.target.checked })}
        />
        Ocultar o CTA nesta página
      </label>
    </section>
  );
}
