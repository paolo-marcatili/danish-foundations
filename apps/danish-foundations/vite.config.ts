import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const githubPagesBase = process.env.GITHUB_PAGES_BASE ?? "/danish-foundations/";

export default defineConfig({
  // GitHub Pages hosts project sites in a repository subdirectory. Keep `/`
  // for local development and Capacitor, and opt into the Pages base only in
  // the deployment workflow.
  base: process.env.GITHUB_PAGES === "true" ? githubPagesBase : "/",
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
