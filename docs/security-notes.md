# Security notes for local development

This project is a browser-based prototype. Keep local development simple and conservative:

- Use Node.js 20.19+ or 22.12+.
- Do not expose the Vite development server to a public network.
- The default Vite config binds to 127.0.0.1 and uses an explicit allowed-host list.
- Treat npm install-script warnings as review prompts. Approve only packages whose install scripts you trust.
- Use `npm audit --omit=dev` to check production/runtime dependencies and `npm audit` to check the full developer toolchain.

Useful commands:

```bash
npm audit
npm audit --omit=dev
npm install-scripts ls
npm approve-scripts --allow-scripts-pending
```

If you already installed dependencies before this security update, rebuild the lockfile:

```bash
rm -rf node_modules package-lock.json
npm install
npm run check
npm run build
npm audit
```
