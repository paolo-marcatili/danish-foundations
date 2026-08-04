# Ord- og Talheltene

Phase A technical prototype for Danish early literacy and mathematics.

## Run locally

From the repository root:

```bash
npm install
npm run dev:danish
```

The app uses port `5174` by default.

## Build

```bash
npm run validate:danish
npm run build:danish
```

For a GitHub Pages project named `danish-foundations`:

```bash
GITHUB_PAGES=true GITHUB_PAGES_BASE=/danish-foundations/ npm run build:danish
```

The production output is written to `apps/danish-foundations/dist`.
