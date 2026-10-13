# Checkbox 5+1 Simulator

## Development

Requires the Node version in `.nvmrc` and pnpm (the version in `package.json`).

```sh
pnpm install
pnpm dev          # serve the app locally
pnpm lint         # ESLint, including the layer boundaries
pnpm typecheck    # TypeScript, with core, world and lcd checked without DOM
pnpm test         # Vitest
pnpm test:e2e     # Playwright smoke tests (first: pnpm exec playwright install chromium)
pnpm build        # static bundle in dist/
```
