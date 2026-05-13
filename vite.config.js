import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/dog-feeder/",

  plugins: [
    react(),

    VitePWA({
      strategies: "injectManifest",

      srcDir: "public",
      filename: "sw.js",

      registerType: "autoUpdate",

      manifest: {
        name: "Dog Feeder",
        short_name: "DogFeeder",
        display: "standalone",
        theme_color: "#111827",
        background_color: "#111827",

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