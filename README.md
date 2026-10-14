# Checkbox 5+1 Simulator

An unofficial training simulator for the Pölz Checkbox 5+1, running in the browser:
**https://lharzenetter.github.io/checkbox-simulator/**

Pölz and "Checkbox" are named only to identify the real device; this project is not made or
endorsed by Pölz. The docs paraphrase the device's manual and quote it only briefly. The simulator
does not replace training on the real device.

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

## Releases

Every push to `main` that passes CI runs semantic-release. A `feat` or `fix` commit cuts a release:
it bumps the version in `package.json`, tags it, publishes a GitHub Release and deploys the build to
GitHub Pages. The `Deploy latest release` workflow redeploys the latest tag by hand.

## License

[MIT](LICENSE)
