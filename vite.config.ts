import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

import { cloudflare } from "@cloudflare/vite-plugin";

const rawBase = process.env.BASE_PATH ?? "/";
const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;
const navigateFallback =
  base === "/" ? "index.html" : `${base.replace(/\/$/, "")}/index.html`;

export default defineConfig({
  base,
  plugins: [react(), VitePWA({
    registerType: "autoUpdate",
    includeAssets: ["favicon.svg"],
    manifest: {
      name: "Symph",
      short_name: "Symph",
      description: "Jellyfin music player you can install on your phone or desktop.",
      lang: "en-GB",
      theme_color: "#0a0a0f",
      background_color: "#0a0a0f",
      display: "standalone",
      orientation: "any",
      prefer_related_applications: false,
      scope: base,
      start_url: base,
      categories: ["music"],
      icons: [
        {
          src: `${base}pwa-192.png`,
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: `${base}pwa-512.png`,
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        },
        {
          src: `${base}pwa-maskable.png`,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable"
        }
      ]
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
      navigateFallback
    }
  }), cloudflare()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  }
});