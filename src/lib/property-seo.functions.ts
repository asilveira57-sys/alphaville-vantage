import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildSeoBody, buildSeoTitle, buildSeoDescription, buildSeoSlug, seoLabels,
  auditProperty, stripMarketing, extractFeatures, type SeoSource,
} from "./property-seo";

type Row = SeoSource & {
  id: string;
  external_ref: string | null;
  descricao_original: string | null;
  description: string | null;
  slug: string | null;
};

export async function generateOpeningWithAI(s: SeoSource): Promise<string | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const { generateText } = await import("ai");
  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const gateway = createLovableAiGatewayProvider(key);

  const areaM2 = s.area_useful ?? s.area_built ?? s.area_total;
  const facts = {
    tipo: seoLabels.typeLabel(s.property_type),
    finalidade: seoLabels.purposeLabel(s.purpose).action,
    condominio: s.condominium_name?.trim() || null, // nome oficial já resolvido
    bairro: s.neighborhood ? seoLabels.cap(s.neighborhood) : null,
    cidade: s.city ? seoLabels.cap(s.city) : null,
    estado: s.state,
    dormitorios: s.bedrooms,
    suites: s.suites,
    banheiros: s.bathrooms,
    vagas: s.parking,
    area_util_m2: s.area_useful,
    area_construida_m2: s.area_built,
    area_total_m2: s.area_total,
    caracteristicas_detectadas: extractFeatures(s.description),
  };

  const prompt = `Você é redator imobiliário factual. Escreva UM ÚNICO parágrafo de abertura (2 a 3 frases, máximo 350 caracteres) apresentando este imóvel.

REGRAS OBRIGATÓRIAS:
- Use SOMENTE os fatos abaixo. Não invente nada.
- Cite OBRIGATORIAMENTE: tipo, finalidade, localização (condomínio/bairro/cidade) e metragem${areaM2 ? ` (${areaM2} m²)` : ""}.
- NÃO cite valores monetários.
- PROIBIDO usar: "excelente oportunidade", "localização privilegiada", "região consolidada", "ótima opção", "infraestrutura completa", "imóvel diferenciado", "ideal para", "perfeito para", "excelente escolha", "oportunidade única", adjetivos exagerados ou opiniões.
- Português brasileiro, tom objetivo e descritivo. Apenas fatos.

Fatos: ${JSON.stringify(facts)}`;

  try {
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      prompt,
    });
    const cleaned = stripMarketing(text.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, " "));
    return cleaned.length > 30 && cleaned.length < 600 ? cleaned : null;
  } catch (e) {
    console.warn("AI opening failed", (e as Error).message);
    return null;
  }
}

/**
 * Regera SEO (descricao_seo, seo_title, seo_description) para 1 ou todos os imóveis.
 * - Preserva descricao_original (do site).
 * - Não altera valores nem campos estruturados.
 * - useAI=true gera abertura natural com IA (1 chamada por imóvel).
 */
export const regenerateSeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; all?: boolean; useAI?: boolean; limit?: number }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { SEO_REGEN_COLS, loadOfficialCondoNames, toSeoSource, buildPublicSeo } = await import("./property-seo-regen.server");

    const PAGE = 100;
    let processed = 0;
    let updated = 0;
    const maxItems = data.limit ?? (data.id ? 1 : 100000);

    for (let from = 0; processed < maxItems; from += PAGE) {
      let q = supabaseAdmin.from("properties").select(SEO_REGEN_COLS)
        .order("id", { ascending: true }).range(from, from + PAGE - 1);
      if (data.id) q = q.eq("id", data.id);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      const list = (rows ?? []) as unknown as Record<string, unknown>[];
      if (!list.length) break;
      const official = await loadOfficialCondoNames(supabaseAdmin, list.map((r) => r["condominium_id"] as string | null));

      for (const row of list) {
        processed++;
        const src = toSeoSource(row, official);
        const opening = data.useAI ? await generateOpeningWithAI(src) : null;
        const out = buildPublicSeo(src, opening);
        // Grava SOMENTE textos públicos de SEO (+ metadados). Nada de slug, preços, condomínio ou overrides.
        const { error: upErr } = await supabaseAdmin.from("properties").update({
          title: out.title,
          seo_title: out.seo_title,
          seo_description: out.seo_description,
          descricao_seo: out.descricao_seo,
          seo_generated_at: new Date().toISOString(),
          seo_used_ai: !!opening,
          audit_status: out.audit.status,
          audit_issues: out.audit.issues,
        } as never).eq("id", row["id"] as string);
        if (!upErr) updated++;
        if (processed >= maxItems) break;
      }

      if (data.id) break;
      if (list.length < PAGE) break;
      if (!data.all) break;
    }

    return { processed, updated, withAI: !!data.useAI };
  });
