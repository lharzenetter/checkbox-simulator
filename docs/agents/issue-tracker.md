# Issue tracker

Work is tracked in GitHub Issues on `lharzenetter/checkbox-simulator`. Use the `gh` CLI.

## Setup constants

- Tracker: GitHub Issues
- Repository: `lharzenetter/checkbox-simulator`
- Ticket reference: `#<number>` (commit scopes too: `fix(#49): …`)

## Repos

This project is a single repo. Every issue belongs to `checkbox-simulator`, whether or not it
carries a `repo:` label; read a missing `repo:` label as `repo:checkbox-simulator`.

## Reading a ticket

```sh
gh issue view <number> --comments
```

The body is the brief. Comments may refine it; a later comment wins over the body.

A spec's tickets are the issues it links: its sub-issues
(`gh api repos/lharzenetter/checkbox-simulator/issues/<number>/sub_issues`) and every `#<number>`
its body references. Blocking edges come from a ticket's "Blocked by #N" lines.

## Labels

| Label             | Meaning                                      |
| ----------------- | -------------------------------------------- |
| `ready-for-agent` | Groomed; an agent may implement it           |
| `ready-for-human` | Groomed; only a person can do it             |
| `in-progress`     | Someone is working on it                     |
| `in-review`       | Its change is committed and waits for review |

## Status transitions

- **In Progress, claim:** `gh issue edit <number> --add-label in-progress --add-assignee @me`
- **In Review:** `gh issue edit <number> --remove-label in-progress --add-label in-review`
- **Done:** closed by the merged pull request (`Closes #<number>` in its body). Never close an
  issue by hand.

## Commenting

```sh
gh issue comment <number> --body "<text>"
```
