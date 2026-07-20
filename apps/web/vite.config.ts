import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves the app under /hero-language-camp/.
  // Local and Capacitor builds continue to use /.
  base:
    process.env.GITHUB_PAGES === "true"
      ? "/hero-language-camp/"
      : "/",

  plugins: [react()],

  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    allowedHosts: ["localhost", "127.0.0.1"]
  },

  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    allowedHosts: ["localhost", "127.0.0.1"]
  }
});