import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/editorial-image/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .storage.from("editorial-images")
          .download(path);
        if (error || !data) return new Response("Not found", { status: 404 });

        const ext = path.split(".").pop()?.toLowerCase() ?? "";
        const mime =
          ext === "png" ? "image/png" :
          ext === "webp" ? "image/webp" :
          ext === "gif" ? "image/gif" :
          ext === "svg" ? "image/svg+xml" :
          ext === "avif" ? "image/avif" :
          "image/jpeg";

        return new Response(data, {
          headers: {
            "Content-Type": mime,
            "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable, stale-while-revalidate=86400",
            "Vary": "Accept",
          },
        });
      },
    },
  },
});
