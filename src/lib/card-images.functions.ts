import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CardImageItem = {
  kind: "featured" | "hub_card" | "condo_cover";
  /** id da página/condomínio */
  id: string;
  /** índice do card dentro do hub (apenas hub_card) */
  index?: number;
  label: string;
  context: string;
  image: string | null;
  url: string | null;
  updated_at?: string | null;
};

export const listCardImages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const items: CardImageItem[] = [];

    const { data: pages, error: pagesErr } = await context.supabase
      .from("editorial_pages")
      .select("id,title,slug,content_type,status,featured_image,cards,updated_at")
      .order("content_type", { ascending: true })
      .order("title", { ascending: true });
    if (pagesErr) throw new Error(pagesErr.message);

    const publicPath = (type: string, slug: string) => {
      switch (type) {
        case "blog": return `/blog/${slug}`;
        case "bairro": return `/bairros/${slug}`;
        case "condominio": return `/condominios/${slug}`;
        case "guia": return `/guia/${slug}`;
        case "hub": return `/${slug}`;
        case "empreendimento": return `/empreendimentos/${slug}`;
        case "parceiro": return `/parceiros/${slug}`;
        default: return `/artigos/${slug}`;
      }
    };

    for (const p of (pages ?? []) as Array<{
      id: string; title: string; slug: string; content_type: string; status: string;
      featured_image: string | null; cards: unknown; updated_at: string | null;
    }>) {
      items.push({
        kind: "featured",
        id: p.id,
        label: p.title,
        context: `${p.content_type} · ${p.status}`,
        image: p.featured_image,
        url: publicPath(p.content_type, p.slug),
        updated_at: p.updated_at,
      });

      const cards = Array.isArray(p.cards) ? (p.cards as Array<Record<string, unknown>>) : [];
      cards.forEach((c, i) => {
        items.push({
          kind: "hub_card",
          id: p.id,
          index: i,
          label: String(c["title"] ?? `Card ${i + 1}`),
          context: `Card de ${p.title}`,
          image: (c["image"] as string) || null,
          url: (c["to"] as string) || null,
          updated_at: p.updated_at,
        });
      });
    }

    const { data: condos, error: condoErr } = await context.supabase
      .from("condominiums")
      .select("id,name,slug,cover_image_url,status,updated_at")
      .order("name", { ascending: true });
    if (condoErr) throw new Error(condoErr.message);

    for (const c of (condos ?? []) as Array<{
      id: string; name: string; slug: string; cover_image_url: string | null; status: string; updated_at: string | null;
    }>) {
      items.push({
        kind: "condo_cover",
        id: c.id,
        label: c.name,
        context: `Condomínio · ${c.status}`,
        image: c.cover_image_url,
        url: `/condominios/${c.slug}`,
        updated_at: c.updated_at,
      });
    }

    return { items };
  });

export const updateCardImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      kind: z.enum(["featured", "hub_card", "condo_cover"]),
      id: z.string().uuid(),
      index: z.number().int().nonnegative().optional(),
      image: z.string().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const image = data.image?.trim() ? data.image.trim() : null;

    if (data.kind === "condo_cover") {
      const { error } = await context.supabase
        .from("condominiums")
        .update({ cover_image_url: image })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    if (data.kind === "featured") {
      const { error } = await context.supabase
        .from("editorial_pages")
        .update({ featured_image: image })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const { data: page, error: readErr } = await context.supabase
      .from("editorial_pages")
      .select("cards")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    const cards = Array.isArray(page?.cards) ? [...(page!.cards as Array<Record<string, unknown>>)] : [];
    const i = data.index ?? -1;
    if (i < 0 || i >= cards.length) throw new Error("Card não encontrado");
    cards[i] = { ...cards[i], image: image ?? "" };

    const { error } = await context.supabase
      .from("editorial_pages")
      .update({ cards: cards as never })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
