/**
 * Registro de auditoria do CMS (Fase G).
 * Nunca lança erro: uma falha no log jamais deve impedir a gravação do conteúdo.
 */
export async function logCmsAction(
  ctx: { supabase: any; userId: string },
  entry: {
    action: string;
    entity_type: string;
    entity_id?: string | null;
    details?: Record<string, unknown>;
  },
) {
  try {
    await ctx.supabase.from("cms_audit_log").insert({
      actor_id: ctx.userId,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      details: entry.details ?? {},
    });
  } catch {
    /* ignora falhas de auditoria */
  }
}

/** Resumo dos campos de SEO alterados, para gravar no log sem despejar o conteúdo inteiro. */
export function seoSnapshot(data: Record<string, any>) {
  return {
    seo_title: data.seo_title ?? data.meta_title ?? null,
    seo_description: data.seo_description ?? data.meta_description ?? null,
    canonical_url: data.canonical_url ?? null,
    robots_index: data.robots_index ?? null,
    robots_follow: data.robots_follow ?? null,
    social_image: data.social_image ?? data.og_image ?? null,
    cta_id: data.cta_id ?? null,
    cta_hidden: data.cta_hidden ?? null,
  };
}
