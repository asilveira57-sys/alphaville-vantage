import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { FloatingWhatsApp } from "./floating-whatsapp";

export function SiteLayout({ children, mobileBottomSpace }: { children: ReactNode; mobileBottomSpace?: boolean }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      {mobileBottomSpace && <div className="md:hidden h-20" aria-hidden />}
      <FloatingWhatsApp />
    </div>
  );
}
