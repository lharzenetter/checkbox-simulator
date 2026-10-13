# Coding standards

How code is written in this repository. These rules are normative: every change follows them.

Stack: TypeScript (strict) + Vite, a framework-free device core, React UI, canvas LCD,
pnpm, Vitest, Playwright, ESLint + Prettier.

## Naming

- Domain nouns come from `GLOSSARY.md` and are used **verbatim**; everything else (verbs,
  plumbing, framework words) is English: `trupp.restzeitMs`, `computeRestzeit()`,
  `type Einsatzstatus`, `handleKeyPress()`.
- Never translate a glossary term (`remainingTime`, `squad`). Terms the glossary lists under
  _Avoid_ are banned in code too.
- Identifiers transliterate umlauts and ß: `ä → ae`, `ö → oe`, `ü → ue`, `ß → ss`
  (`rueckzugsalarm`, `Rueckmarsch`). Strings shown to the Trainee or on the LCD keep the real
  characters, verbatim from the device.
- Casing follows TypeScript convention regardless of language: `camelCase` values and
  functions, `PascalCase` types and components, `UPPER_SNAKE_CASE` constants.

## Module layout and boundaries

One Vite app, one folder per layer under `src/`:

| Folder     | Holds                                                                     | May import       | Browser APIs |
| ---------- | ------------------------------------------------------------------------- | ---------------- | ------------ |
| `core/`    | Device reducer: `state + event → state`                                   | nothing          | no           |
| `world/`   | Tally roster, Atemschutzträger, simulation clock (speed, pause)           | `core`           | no           |
| `lcd/`     | Screen model → 1-bit framebuffer (pure), plus a thin canvas painter       | `core`           | painter only |
| `audio/`   | Siren synthesis (Web Audio)                                               | `core`           | yes          |
| `storage/` | Browser-storage persistence and the incompatible-data wipe                | `core`, `world`  | yes          |
| `ui/`      | React: front panel, roster, clock controls; wires everything together     | everything       | yes          |

- Imports point one way only, as in the table. Only `ui/` imports React.
- `core/` has no DOM, no `Date.now()`, no timers and no randomness.
- Each layer exposes one public entry, `src/<layer>/index.ts`; other layers import only from it.
  No other barrel files.
- Enforcement: ESLint `no-restricted-imports` per folder, and a separate `tsconfig` for `core`,
  `world` and the pure part of `lcd` with `lib: ["ES2022"]` and no `DOM`, so a stray `window`
  fails the typecheck.

## The device core

- **State** is plain, immutable data: `readonly` types, no classes, no methods. It must
  serialise to storage as-is.
- **Events** are a discriminated union on `type`, named in the past tense for what happened:
  `{ type: "keyPressed", key: "OK" }`, `{ type: "tallyHeld", tallyId }`, `{ type: "tick", now }`.
- **Time** reaches the core only through `tick` events or `now` fields. The core never reads a
  clock.
- **The reducer** `reduce(state, event): State` is total and pure. Input with no meaning on the
  current screen returns the state unchanged. Throw only for broken invariants (programmer
  errors).
- **Effects** (siren, LED blinking) are not emitted as commands. They are derived from state by
  selectors such as `isAlarmSounding(state)`; `ui/` and `audio/` react to them.
- Every `switch` on a union ends in an `assertNever` default.
- **Units:** times are integer milliseconds named `…Ms` (`restzeitMs`); pressures are integer bar
  named `…Bar`. Formatting for display (`-0:00:10`) happens only in `lcd/`.
- **Device parameters** live in one file, `core/parameters.ts`, named after the manual's
  parameter number and meaning (`P42_RUECKZUGSDRUCK_BAR`). Never inline them.

## Testing

- `core/`, `world/` and `lcd/` are written test-first (red, green, refactor) for every
  behaviour change.
- Tests drive the public API only: `reduce` and selectors, the screen model. Never test
  internal helpers.
- Tests move time with `tick` events or the world's fake clock. No real timers; no
  `vi.useFakeTimers` in core tests.
- Test names describe behaviour in domain language; glossary terms keep their umlauts in the
  name string: `it("fires the Rückzugsalarm once per Anmarsch leg")`.
- A test for a rule from the manual or `docs/research/` cites it in a comment:
  `// manual 5.4.2`, `// timing-and-alarm-rules §6`.
- The LCD is asserted on its screen model, plus a few framebuffer snapshots per screen layout.
- React components get thin tests only where they hold logic. Playwright covers a handful of
  smoke flows: power on, log in a Trupp, alarm, log off.
- No coverage percentage gate; test-first replaces it.
- Test files sit next to the code: `restzeit.ts` → `restzeit.test.ts`.

## Type checking, linting, formatting

- `tsconfig`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitOverride`, `verbatimModuleSyntax`.
- ESLint: `typescript-eslint` `strictTypeChecked` and `stylisticTypeChecked`,
  `eslint-plugin-react-hooks`, and the boundary rules above. Additionally:
  - no `any`, no non-null assertions (`!`), no `as` casts outside tests;
  - no `enum`; use string-literal unions;
  - named exports only; default exports only where a tool requires them (Vite config).
- Prettier with its defaults. Style is whatever Prettier outputs.
- Husky + lint-staged run Prettier and ESLint on staged files.
- CI runs `lint`, `typecheck`, `test` and `build`; any failure blocks, and lint runs with
  `--max-warnings 0`.

## Files, functions, comments

- File names are `kebab-case.ts`; React components are `PascalCase.tsx`.
- Functions are small and pure by default. Use `function` declarations at module level, not
  arrow-function constants.
- Comments say **why**, never what. A rule taken from the manual or a decision cites its source
  (`// manual 5.3.1`, `// decided in "Decide when one-shot and repeating alarms fire"`).
- Behaviour the manual does not back is marked `// ASSUMPTION:` with a reference to where it was
  decided.
- Domain terms are defined only in `GLOSSARY.md`, decisions only in `docs/adr/`; code does not
  restate them. TSDoc only on each layer's public exports.

## React UI

- One hook, `useSimulator()`, owns the core state via `useReducer(reduce)`, drives `tick` from
  `requestAnimationFrame`, persists through `storage/`, and hands components state and
  `dispatch`. No Redux, Zustand or broad Context.
- Function components only, props typed inline.
- Components hold no domain logic: they read core selectors and dispatch events. Any decision
  about Trupps or alarms belongs in `core/`.
- Front-panel keys are real `<button>` elements with German `aria-label`s (`"Taste OK"`).
  Keyboard shortcuts (1–9 for Tallys, and the rest) go through one central key map, not
  scattered listeners.
- Styling uses CSS Modules (`Component.module.css`); no Tailwind, no CSS-in-JS.
- UI copy is German; LCD text is verbatim from the device. No i18n framework.
