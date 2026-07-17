import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6">Erro 404</p>
        <h1 className="font-serif text-5xl font-medium text-ink">Página não encontrada</h1>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          O endereço que você buscou não existe ou foi movido. Voltar ao portal editorial.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-ink px-5 py-3 text-xs uppercase tracking-widest font-medium text-canvas transition-colors hover:bg-ink/85"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6">Ocorreu um erro</p>
        <h1 className="font-serif text-3xl font-medium text-ink">
          Esta página não carregou
        </h1>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          Algo deu errado. Tente novamente ou retorne ao início.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center bg-ink px-5 py-3 text-xs uppercase tracking-widest font-medium text-canvas transition-colors hover:bg-ink/85"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center border border-ink/15 bg-canvas px-5 py-3 text-xs uppercase tracking-widest font-medium text-ink transition-colors hover:bg-ink/5"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "S.A Imóveis Alphaville — Portal Editorial Regional" },
      {
        name: "description",
        content:
          "Portal editorial sobre Alphaville, Tamboré, Barueri e Santana de Parnaíba: mercado imobiliário, condomínios, história, gastronomia e cultura de alto padrão.",
      },
      { name: "author", content: "S.A Imóveis Alphaville" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "S.A Imóveis Alphaville" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "S.A Imóveis Alphaville — Portal Editorial Regional" },
      { name: "twitter:title", content: "S.A Imóveis Alphaville — Portal Editorial Regional" },
      { property: "og:description", content: "Portal editorial sobre Alphaville, Tamboré, Barueri e Santana de Parnaíba: mercado imobiliário, condomínios, história, gastronomia e cultura de alto padrão." },
      { name: "twitter:description", content: "Portal editorial sobre Alphaville, Tamboré, Barueri e Santana de Parnaíba: mercado imobiliário, condomínios, história, gastronomia e cultura de alto padrão." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c5596796-0507-42bb-8c85-362db8cf1b75/id-preview-810af689--423bfacb-1903-41d0-956b-db8a8497dedd.lovable.app-1784294776987.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c5596796-0507-42bb-8c85-362db8cf1b75/id-preview-810af689--423bfacb-1903-41d0-956b-db8a8497dedd.lovable.app-1784294776987.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          name: "S.A Imóveis Alphaville",
          areaServed: ["Alphaville", "Tamboré", "Barueri", "Santana de Parnaíba"],
          description:
            "Consultoria imobiliária e portal editorial regional de Alphaville e arredores.",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
