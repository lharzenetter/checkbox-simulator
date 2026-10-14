# AGENTS.md

## Coding standards

How code is written here: @CODING_STANDARDS.md

Those rules are normative and apply to **every** change, trivial or complex.

## Commit messages

Always write commit messages in the Conventional Commits format that
semantic-release parses: `<type>(<optional scope>): <subject>`, e.g.
`feat(alarms): add Rückzugsalarm`, `fix: …`, `docs: …`, `chore: …`.
Mark breaking changes with `!` after the type or a `BREAKING CHANGE:` footer.
While the version is below 1.0, do not mark anything breaking: semantic-release would jump
straight to 1.0.0. Only the user decides when 1.0 comes.

## Agent skills

### Issue tracker

Inside GitHub issues.

### Domain docs

Single-context: one `GLOSSARY.md` plus `docs/adr/` at the repo root.
