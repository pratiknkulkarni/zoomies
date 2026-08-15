---
description: Read the open Gitea issues, pick one, and fix it.
allowed-tools: Bash(scripts/gitea.sh:*), Bash(git:*), Bash(npm:*), Read, Edit, Write, Grep, Glob
---

Work through the bug queue with me.

## 1. Read the queue

Run `scripts/gitea.sh issues` for the list, then `scripts/gitea.sh issue <n>` on
each one that is not self-explanatory.

Most of these were filed one-handed between sets and will be one line long. That
is by design — do not treat brevity as a lack of information to complain about.
Reconstruct what you can from the code before asking me anything.

## 2. Report

Give me the open issues in one short list, ordered by what you would fix first.
For each: the number, one line on what it is, and — where it is not obvious —
one line on what you think is actually causing it, having looked.

Rank by consequence, not by effort:

1. **Anything that lost a set, or could.** Invariant 1. Nothing outranks it.
2. **Anything that shows a number that is not true.** A journal that misreports
   is worse than one that is missing a feature, because it is trusted.
3. **Anything that is hard to do mid-session with tired hands.**
4. Everything else.

If an issue is really an idea, say so and suggest relabelling rather than
building it.

Then stop and let me choose. Do not start fixing.

## 3. Fix the one I pick

- Branch: `fix/<number>-<short-slug>`.
- Read `docs/DESIGN.md`, `docs/FEATURES.md` and `docs/TECH_STACK.md` before any
  decision they cover. They are authoritative and they are in the private
  `docs/` repository — see CLAUDE.md § Repository.
- Add a unit test when the fault is in `lib/` or a query. Do not add a component
  or navigation test; the project does not have them and this is not the moment
  to start.
- `npm run typecheck && npm run lint && npm test` before you say it is done.
- Commit message: what was wrong, why, and what the fix does. Last line
  `Fixes #<number>` so Gitea closes it when this reaches `main`.

## 4. Say what is still unverified

Most of these can only really be confirmed on the phone. Say plainly which part
you proved and which part is waiting on a device — do not describe a fix as
verified because it compiles.
