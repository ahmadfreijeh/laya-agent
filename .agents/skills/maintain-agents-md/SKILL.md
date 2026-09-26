---
name: maintain-agents-md
description: Keep this project's AGENTS.md compact and current after changes that alter architecture, routes, file ownership, commands, policies, or durable development invariants. Do not use for ordinary copy, styling, test-only, or isolated bug-fix changes.
---

# Maintain AGENTS.md

Update the repository-root `AGENTS.md` only when completed work changes information that would materially improve a future agent's decisions.

## Review scope

Start with `git diff --name-only` and `git diff --stat`. Read the existing `AGENTS.md`, then inspect only changed files needed to verify a durable fact. Do not walk the repository or summarize the entire diff.

An update belongs in `AGENTS.md` when it changes at least one of these:

- system boundaries or request/data flow;
- the canonical file for a type of change;
- a route, service, command, environment requirement, or operational workflow;
- a policy threshold, fallback, or non-obvious invariant;
- a recurring constraint whose omission would likely cause incorrect future work.

Skip the update when the change is limited to copy, CSS, markup arrangement, tests, refactoring within the same ownership boundary, or a one-off bug fix with no durable lesson.

## Editing rules

- Prefer correcting or extending an existing sentence, table row, or bullet.
- Keep entries short and factual; use file paths instead of explanations where possible.
- Preserve the existing headings and compact style.
- Do not add history, dates, completed-feature notes, speculative plans, or information easily learned from one already-named file.
- Remove stale guidance when replacing it.
- Never rewrite unrelated sections.

After editing, run `git diff --check -- AGENTS.md` and review the final diff for duplication. If no qualifying fact changed, leave `AGENTS.md` untouched and continue without reporting an error.
