import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/dog-feeder/",

  plugins: [
    react(),

    VitePWA({
      strategies: "injectManifest",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "icon.png", "icon-192.png", "icon-512.png", "notification-badge.png"],

      srcDir: "public",
      filename: "sw.js",

      registerType: "autoUpdate",

      manifest: {
        name: "Dog Feeder",
        short_name: "Dog Feeder",
        display: "standalone",
        theme_color: "#111827",
        background_color: "#111827",
        start_url: "/dog-feeder/",
        scope: "/dog-feeder/",

        icons: [
          {
            src: "/dog-feeder/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/dog-feeder/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
  ]
});