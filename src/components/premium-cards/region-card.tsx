import * as React from "react";
import { Building2, Diamond, Landmark, MapPin } from "lucide-react";
import * as React from "react";
import { PremiumCard } from "@/components/premium-card";

const ICONS: Record<string, React.ReactNode> = {
  alphaville: <Building2 className="h-5 w-5" strokeWidth={1.8} />,
  tambore: <Diamond className="h-5 w-5" strokeWidth={1.8} />,
  barueri: <Building2 className="h-5 w-5" strokeWidth={1.8} />,
  santana: <Landmark className="h-5 w-5" strokeWidth={1.8} />,
};

function iconFor(slug: string) {
  const s = slug.toLowerCase();
  if (s.includes("alphaville")) return ICONS.alphaville;
  if (s.includes("tambor")) return ICONS.tambore;
  if (s.includes("barueri")) return ICONS.barueri;
  if (s.includes("santana") || s.includes("parnaiba")) return ICONS.santana;
  return <MapPin className="h-5 w-5" strokeWidth={1.8} />;
}

export type PremiumRegionCardProps = {
  to: string;
  slug: string;
  title: string;
  description?: string;
  image?: string | null;
};

export function PremiumRegionCard({ to, slug, title, description, image }: PremiumRegionCardProps) {
  return (
    <PremiumCard
      to={to as never}
      image={image}
      imageAlt={title}
      eyebrow="Guia Regional"
      title={title}
      description={description}
      icon={iconFor(slug)}
      cta="Explorar guia"
      aspectRatio="tall"
      fallback={{ type: "region", region: slug }}
    />
  );
}
