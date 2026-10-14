# Choose the simulator's tech stack and hosting

The simulator is a purely static, client-side web app with no backend. The whole simulation runs in the browser, and persistence uses browser storage.

It is **public without access control**: the repository is public under the MIT license and the app is served from GitHub Pages at `https://lharzenetter.github.io/checkbox-simulator/`.

- **Before going public**, the figures cropped from the manual were removed from the entire git history, not just from `main`. The docs keep only paraphrase and short quotes.
- **Every page shows a footer** saying the simulator is unofficial, not made by Pölz and no substitute for training on the real device, with the release version.
- **A deploy follows a release.** semantic-release runs on `main` after CI passes; a release bumps `package.json`, tags and publishes a GitHub Release, and only then is the build deployed. There is no CHANGELOG file. Releases started from a hand-set `v0.1.0` tag, so the version stays below 1.0 until a breaking change is marked.
- **The shared `lharzenetter.github.io` origin** needs no extra handling: every stored key carries the simulator's prefix.
- The Playwright smoke flows run against the production build under the Pages base path.

The stack:

- **Language and build:** TypeScript (strict) and Vite, with pnpm and a pinned Node LTS.
- **Device core:** framework-free TypeScript with no DOM, a `state + event → state` reducer. Time reaches it only through `tick` events, which keeps the seam between the device and the world (Tallys, clock) explicit, so trainer or scripted modes can be added later.
- **UI:** React.
- **LCD:** a pure screen model, rendered to a 1-bit framebuffer at the LCD's resolution (about 128 × 128 px) and drawn scaled on a canvas. Tests assert on the screen model, not on pixels. The front panel (housing, keys, LED) is SVG/DOM with real focusable buttons.
- **Tooling:** Vitest for the core and the renderer, a few Playwright smoke tests, and ESLint with Prettier. CI runs lint, typecheck, test and build.

How code is written on this stack is in [`CODING_STANDARDS.md`](../../CODING_STANDARDS.md).

## Considered options

- **GitHub Pages behind a password** (StaticCrypt, Cloudflare Access, Enterprise private Pages). Dropped first for a local-only simulator, then for going public; the comparison is kept in [`pages-access-control.md`](../research/pages-access-control.md).
- **Local only, no hosting.** The first answer, reversed so Trainees can use the simulator without a checkout.
- **Deploying every push to `main`.** Rejected so that the live site always matches a tagged release and its version.
- **A DOM text grid for the LCD.** Rejected: the device has a graphic dot-matrix LCD with several fonts, pixel graphics and inverse bars, which a text grid can't reproduce.

Decided in [Choose the simulator's tech stack and hosting](https://github.com/lharzenetter/checkbox-simulator/issues/4), amended by [Password-protect the GitHub Pages deployment](https://github.com/lharzenetter/checkbox-simulator/issues/18) and by the deployment grilling of 2026-10-14, which made the repository public.
