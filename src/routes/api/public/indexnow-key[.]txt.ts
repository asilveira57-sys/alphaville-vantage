import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// Arquivo de verificação IndexNow.
// A chave é servida em texto puro para que Bing/Yandex verifiquem
// que somos donos do domínio antes de aceitar os pings.
export const Route = createFileRoute("/api/public/indexnow-key.txt")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env.INDEXNOW_KEY;
        if (!key) {
          return new Response("IndexNow key not configured", { status: 503 });
        }
        return new Response(key, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
