import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/dog-feeder/",

  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      manifest: {
        name: "Dog Feeder",
        short_name: "DogFeeder",
        description: "Dog feeding reminder app",
        theme_color: "#111827",
        background_color: "#111827",
        display: "standalone",
        start_url: "/dog-feeder/",

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