import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { FloatingWhatsApp } from "./floating-whatsapp";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <FloatingWhatsApp />
    </div>
  );
}
