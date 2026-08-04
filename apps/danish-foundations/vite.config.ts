import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const githubPagesBase = process.env.GITHUB_PAGES_BASE ?? "/danish-foundations/";
const storageNamespace = process.env.VITE_STORAGE_NAMESPACE ?? "da-foundations";
const armenianAppUrl = process.env.VITE_ARMENIAN_APP_URL ?? (process.env.GITHUB_PAGES === "true" ? "/hero-language-camp/armenian/" : "http://127.0.0.1:5173/");
const danishAppUrl = process.env.VITE_DANISH_APP_URL ?? (process.env.GITHUB_PAGES === "true" ? "/hero-language-camp/danish/" : "http://127.0.0.1:5174/");

export default defineConfig({
  // GitHub Pages hosts project sites in a repository subdirectory. Keep `/`
  // for local development and Capacitor, and opt into the Pages base only in
  // the deployment workflow.
  base: process.env.GITHUB_PAGES === "true" ? githubPagesBase : "/",
  define: {
    "import.meta.env.VITE_STORAGE_NAMESPACE": JSON.stringify(storageNamespace),
    "import.meta.env.VITE_ARMENIAN_APP_URL": JSON.stringify(armenianAppUrl),
    "import.meta.env.VITE_DANISH_APP_URL": JSON.stringify(danishAppUrl)
  },
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    allowedHosts: ["localhost", "127.0.0.1"]
  },
  preview: {
    host: "127.0.0.1",
    port: 4174,
    strictPort: true,
    allowedHosts: ["localhost", "127.0.0.1"]
  }
});
