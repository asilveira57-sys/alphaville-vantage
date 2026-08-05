import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { SectionPage, ComingSoonGrid, type BreadcrumbItem } from "./section-page";
import { EditorialContent } from "./editorial-content";
import { getEditorialBySlug } from "@/lib/editorial.functions";

export type HubCard = {
  eyebrow: string;
  title: string;
  lead: string;
  to?: string;
  image?: string | null;
};

export type HubDefaults = {
  eyebrow: string;
  title: string;
  lead: string;
  cards: HubCard[];
};

export const hubQO = (slug: string) =>
  queryOptions({
    queryKey: ["editorial", "hub", slug],
    queryFn: () => getEditorialBySlug({ data: { slug } }),
    staleTime: 0,
    refetchOnMount: "always",
  });

interface Props {
  slug: string;
  defaults: HubDefaults;
  breadcrumbs: BreadcrumbItem[];
  children?: ReactNode;
}

export function HubPageView({ slug, defaults, breadcrumbs, children }: Props) {
  const { data } = useSuspenseQuery(hubQO(slug));
  const isHub = data && data.content_type === "hub";
  const eyebrow = (isHub && data.hero_eyebrow) || defaults.eyebrow;
  const title = (isHub && data.title) || defaults.title;
  const lead = (isHub && (data.excerpt as string)) || defaults.lead;
  const html = isHub && typeof data.html_content === "string" ? data.html_content : "";
  const rawCards = (isHub && Array.isArray((data as any).cards) ? (data as any).cards : null) as
    | HubCard[]
    | null;
  const cards: HubCard[] =
    rawCards && rawCards.length > 0
      ? rawCards.map((c) => ({
          eyebrow: c.eyebrow ?? "",
          title: c.title ?? "",
          lead: c.lead ?? "",
          to: c.to || undefined,
          image: c.image ?? null,
        }))
      : defaults.cards;

  return (
    <SectionPage eyebrow={eyebrow} title={title} lead={lead} breadcrumbs={breadcrumbs}>
      {html ? (
        <EditorialContent
          html={html}
          className="mx-auto mb-20 max-w-3xl border-b border-ink/10 pb-16"
        />
      ) : null}
      <ComingSoonGrid
        items={cards.map((c) => ({
          eyebrow: c.eyebrow,
          title: c.title,
          lead: c.lead,
          to: c.to as never,
          image: c.image ?? null,
        }))}
      />
      {children}
    </SectionPage>
  );
}
