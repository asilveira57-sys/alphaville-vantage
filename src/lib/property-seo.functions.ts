import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildSeoBody, buildSeoTitle, buildSeoDescription, buildSeoSlug, seoLabels,
  type SeoSource,
} from "./property-seo";

type Row = SeoSource & {
  id: string;
  external_ref: string | null;
  descricao_original: string | null;
  description: string | null;
  slug: string | null;
};

async function generateOpeningWithAI(s: SeoSource): Promise<string | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const { generateText } = await import("ai");
  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const gateway = createLovableAiGatewayProvider(key);

  const facts = {
    tipo: seoLabels.typeLabel(s.property_type),
    finalidade: seoLabels.purposeLabel(s.purpose).action,
    condominio: s.condominium_name ? seoLabels.cap(s.condominium_name) : null,
    bairro: s.neighborhood ? seoLabels.cap(s.neighborhood) : null,
    cidade: s.city ? seoLabels.cap(s.city) : null,
    estado: s.state,
    dormitorios: s.bedrooms,
    suites: s.suites,
    vagas: s.parking,
    area_util_m2: s.area_useful,
    area_construida_m2: s.area_built,
  };

  const prompt = `Você é redator imobiliário. Escreva UM ÚNICO parágrafo de abertura (2 a 3 frases, máximo 350 caracteres) apresentando este imóvel. Use SOMENTE os fatos abaixo — não invente nada, não cite valores, não use adjetivos exagerados. Português brasileiro, tom profissional.

Fatos: ${JSON.stringify(facts)}`;

  try {
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      prompt,
    });
    const cleaned = text.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, " ");
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

    const PAGE = 100;
    let processed = 0;
    let updated = 0;
    const maxItems = data.limit ?? (data.id ? 1 : 5000);

    for (let from = 0; processed < maxItems; from += PAGE) {
      let q = supabaseAdmin
        .from("properties")
        .select("id,external_ref,slug,description,descricao_original,property_type,purpose,city,state,neighborhood,condominium_name,bedrooms,suites,bathrooms,parking,area_useful,area_built,area_total,price_sale,price_rent,condo_fee,iptu,furnished,is_launch,accepts_exchange,internal_code")
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1);
      if (data.id) q = q.eq("id", data.id);

      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      const list = (rows ?? []) as unknown as Row[];
      if (!list.length) break;

      for (const row of list) {
        processed++;
        const src: SeoSource = { ...row, description: row.descricao_original ?? row.description };
        const opening = data.useAI ? await generateOpeningWithAI(src) : null;

        const descricao_seo = buildSeoBody(src, opening);
        const seo_title = buildSeoTitle(src);
        const seo_description = buildSeoDescription(src);

        // Preserva descricao_original (se ainda não houver, copia da description bruta)
        const descricao_original = row.descricao_original ?? row.description ?? null;

        const update: Record<string, unknown> = {
          descricao_original,
          descricao_seo,
          seo_title,
          seo_description,
          seo_generated_at: new Date().toISOString(),
          seo_used_ai: !!opening,
        };

        // Atualiza slug somente se ainda for o legado (com sufixo aleatório do scraper)
        const niceSlug = buildSeoSlug(src, row.external_ref);
        if (niceSlug && niceSlug.length > 8) update.slug = niceSlug;

        const { error: upErr } = await supabaseAdmin
          .from("properties").update(update as never).eq("id", row.id);
        if (!upErr) updated++;

        if (processed >= maxItems) break;
      }

      if (data.id) break;
      if (list.length < PAGE) break;
      if (!data.all) break;
    }

    return { processed, updated, withAI: !!data.useAI };
  });
