import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Pré-carrega a página ao passar o mouse/tocar no link e reaproveita
    // os dados por alguns minutos, evitando refazer consultas a cada clique.
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    defaultPreloadStaleTime: 60_000,
    defaultStaleTime: 2 * 60_000,
    defaultGcTime: 10 * 60_000,
  });

  return router;
};
