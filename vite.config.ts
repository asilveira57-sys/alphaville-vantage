// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "node:path";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        manifest: false,
        filename: "sw.js",
        devOptions: { enabled: false },
        workbox: {
          cacheId: "sa-app-icons-v2",
          globPatterns: ["assets/**/*.{js,css,woff2}", "offline.html", "icons/*.png", "favicon.ico"],
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          skipWaiting: false,
          clientsClaim: true,
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ url, request }) =>
                request.mode === "navigate" &&
                url.origin === self.location.origin &&
                !/^\/(admin|cms|auth|audit|reset-password|area-do-parceiro|api|_serverFn|lovable|~oauth)/.test(url.pathname),
              handler: "NetworkFirst",
              options: {
                cacheName: "sa-pages",
                networkTimeoutSeconds: 6,
                expiration: { maxEntries: 40, maxAgeSeconds: 7 * 24 * 3600 },
                plugins: [{ handlerDidError: async () => (await caches.match("/offline.html")) ?? Response.error() }],
              },
            },
            {
              urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith("/api/public/property-thumb/"),
              handler: "CacheFirst",
              options: { cacheName: "sa-thumbs", expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 3600 } },
            },
            {
              urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
              handler: "CacheFirst",
              options: { cacheName: "sa-fonts", expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 3600 } },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(__dirname, "node_modules/entities"),
      },
    },
  },
});
