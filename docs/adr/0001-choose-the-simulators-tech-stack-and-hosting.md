# Choose the simulator's tech stack and hosting

The simulator is a purely static, client-side web app with no backend. The whole simulation runs in the browser, and persistence uses browser storage. For now it is **run locally only**: there is no GitHub Pages deploy and no access control. If it is hosted later, it goes public without restriction, so hosting stays a deployment concern and needs no change to the app.

- **Language and build:** TypeScript (strict) and Vite, with pnpm and a pinned Node LTS.
- **Device core:** framework-free TypeScript with no DOM, a `state + event → state` reducer. Time reaches it only through `tick` events, which keeps the seam between the device and the world (Tallys, clock) explicit, so trainer or scripted modes can be added later.
- **UI:** React.
- **LCD:** a pure screen model, rendered to a 1-bit framebuffer at the LCD's resolution (about 128 × 128 px) and drawn scaled on a canvas. Tests assert on the screen model, not on pixels. The front panel (housing, keys, LED) is SVG/DOM with real focusable buttons.
- **Tooling:** Vitest for the core and the renderer, a few Playwright smoke tests, and ESLint with Prettier. CI runs lint, typecheck, test and build.

How code is written on this stack is in [`CODING_STANDARDS.md`](../../CODING_STANDARDS.md).

## Considered options

- **GitHub Pages behind a password** (StaticCrypt, Cloudflare Access, Enterprise private Pages). Dropped when deployment became local-only; the comparison is kept in [`pages-access-control.md`](../research/pages-access-control.md), including what to consider before the simulator goes public (manual figures, the Pölz GUI, disclaimers).
- **A DOM text grid for the LCD.** Rejected: the device has a graphic dot-matrix LCD with several fonts, pixel graphics and inverse bars, which a text grid can't reproduce.

Decided in [Choose the simulator's tech stack and hosting](https://github.com/lharzenetter/checkbox-simulator/issues/4), amended by [Password-protect the GitHub Pages deployment](https://github.com/lharzenetter/checkbox-simulator/issues/18).
