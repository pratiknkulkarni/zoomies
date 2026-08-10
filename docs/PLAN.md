# Build Plan

**Project:** Zoomies
**Document Type:** Execution Source of Truth
**Status:** Authoritative — for sequencing only
**Last Updated:** August 2026
**Companion Documents:** `TECH_STACK.md`, `FEATURES.md`, `DESIGN.md`

---

## Current Phase

> **Phase 1 — Database Foundation. Closed 3 Aug 2026.** Both schema questions
> settled and folded into the first migration, so there is no second migration
> to write.
>
> Every Phase 0 and Phase 1 exit criterion now verified on an Android emulator
> (Pixel 7a, API 36), against the live on-device database rather than a
> stand-in: nine tables and thirteen indexes present, 41 catalogue exercises
> with 15 active, the `meta` flag set. A second launch left every row
> byte-identical. A built-in soft-deleted behind the app's back stayed deleted
> across a relaunch, with nothing re-inserted. IDs are v7 and sort identically
> by `id` and by `created_at`. Both themes render at exactly the `bg` token,
> flipping live with no relaunch, and the heading measures as Geist 600 rather
> than the platform face.
>
> **Phase 2 — Exercises. Closed 3 Aug 2026.** The library, the family-driven
> Suggested section, exercise detail, custom exercises and ordered metric
> configuration are built, on branch `phase-2-exercises`.
>
> All four exit criteria verified on the emulator against a restored seed. DoD 9
> passes: a suggestion activates in one tap, moving into the library and out of
> Suggested. A dismissal is absent after a force-stop and relaunch. Editing an
> exercise's metrics — reorder, delete, add — leaves `set_metric_values`
> byte-identical, proven against a set inserted by hand because logging does not
> exist until Phase 4. No colour, spacing or radius literal appears in any of the
> fifteen files the phase added.
>
> Merged to `main` 4 Aug 2026.
>
> **Phase 2 follow-ups. Closed 4 Aug 2026**, branch `phase-2-followups`.
> Reviewing the phase found two capabilities with no way to reach them —
> `archivedExercises()` and `updateMetric()` were both correct and both dead
> code, leaving archiving one-way and a mistyped metric fixable only by deleting
> it. Archived exercises now have their own screen, reached from the Exercises
> tab only while something is archived; metric name and unit are editable in
> place. Suggestions no longer vanish when the last member of a family is
> archived, and list rows say what their metrics measure. `FEATURES.md` §3.3 and
> §3.5 amended for the first two. Verified on a fresh seed, including that a
> rename leaves `set_metric_values` byte-identical.
>
> **Phase 3 — Templates. Closed 4 Aug 2026**, branch `phase-3-templates`.
> Template list on Home with create, rename and delete; slots added, reordered
> and removed; per-slot `target_sets`, `target_metric_id` + `target_value` and
> `rest_seconds`.
>
> Both exit criteria verified on device against a reset database. **DoD 1** — a
> template created from Home with two exercises and a 3 × 8 reps target, slots
> appending at 0/1/2, reordering renumbering contiguously, removal closing the
> gap. **Criterion 2** — `rest_seconds` reads back as SQLite type `null`, not
> integer `0`, proven against a slot holding `0` and a slot holding the default
> `60` in the same table at the same time.
>
> `renumber` moved to `db/mutations/ordering.ts` — two tables now carry a
> user-arranged `display_order` with identical arithmetic and unrelated
> meanings. `lib/parse.ts` added as the edge where invariant 2 is enforced.
> `FEATURES.md` §5 amended: it defined templates fully but never said they live
> on Home.
>
> **Phase 4 — Active Session & Logging. Closed 4 Aug 2026**, branch
> `phase-4-session`. Sessions start from a template with targets snapshotted
> onto `exercise_entries`; the session screen carries live `2 / 4` counters;
> number-primary logging with steppers, `to_failure`, inline set edit and
> delete, entry notes, and a session-only target override; the §6.3 lifecycle
> with explicit pause, keep-awake and haptics.
>
> **Five of six exit criteria verified end to end.** DoD 2, DoD 3 (a second
> session shows `Last time 8` from the first, and the template's `3 × 9` rather
> than the previous session's `3 × 6` override), DoD 5, criterion 5 (a template
> moved to `42 × 99` left a completed session's `3 × 6` untouched) and criterion
> 6.
>
> **Criterion 4 is verified by mechanism, not by the race.** `logSet` is one
> transaction resolving only after COMMIT, and sets survived every force-stop
> and a full APK reinstall — but `adb shell input tap` returns on injection, so
> a kill issued immediately after lands before the tap is dispatched and proves
> nothing. **Needs one manual check on a physical device.**
>
> Duration-primary logging (the tap-to-time button) is Phase 5 by design; holds
> are typed in seconds today, which §8 keeps available regardless.
>
> **Phase 4 follow-ups. Closed 6 Aug 2026**, branch `phase-4-followups`.
> A full smoke test of Phases 0–4 on a Pixel 7a (`docs/SMOKE_TEST.md`) found the
> data layer and the training loop clean; every finding was interface, wording
> or input handling. Seventeen items, fourteen commits, two data migrations.
>
> The three that mattered: **the keyboard covered every form**, because
> edge-to-edge makes `adjustResize` inert from Android 15; **six fields silently
> discarded their edits**, because `keyboardShouldPersistTaps="handled"` means a
> focused field never blurs and all six committed on blur; and **the metric
> editor was rebuilt rather than patched a fourth time** — it asked the user to
> compose name, type and unit, and `number` covers both a count and a load, so a
> unit list scoped by type could only ever offer `kg` to both.
>
> `lib/metrics.ts` replaces that with four whole metrics. What one measures is
> convertible until the first set is logged against it, guarded inside the
> mutation. `FEATURES.md` §4.1 rewritten, §3.2 and §5.2 amended; `DESIGN.md`
> gained §6.6–6.8.
>
> **Verification is uneven and the gap is recorded deliberately.** The
> migrations were proven against a scratch database and then against the pulled
> device database — all three applied, units reduced to `null`/`s`/`kg`, no typo
> surviving. The metric rebuild, the search and the blur fix are verified by
> compiler, 47 unit tests and bundle contents only; the phone was locked or
> dozing on every attempt. **Smoke test E6, K2, L2, L4 and L6 remain
> unanswered**, and E6 — clearing rest must read `No rest timer`, never
> `0s rest` — now sits in the code path the blur fix rewrote. E6 is since
> retired: the rest timer is cut and the column dropped.
>
> **Phase 5 — Timers. Closed 6 Aug 2026**, branch `phase-5-timers`.
> `lib/timers.ts` written test-first, the rest timer cut before it was built,
> and the hold timer shipped.
>
> **The rest timer is cut** (`FEATURES.md` §15). A countdown pushing you back to
> the bar works against an unhurried two-hour session. It took
> `expo-notifications` with it — the scheduling, cancelling and
> deliver-to-a-killed-app machinery was the largest part of the phase — and it
> settled a problem the phase would otherwise have had to solve, since an entry
> could no longer find its slot unambiguously once one exercise was allowed to
> appear twice in a template. Migration 0003 drops `rest_seconds`.
>
> **All exit criteria verified on the Pixel 7a.** The countdown beeps at zero,
> records the set at the target and resets for the next; stopping early records
> what was actually held; the hairline track fills; leaving mid-hold records
> nothing. Criterion 2 is met by 66 unit tests, including the ninety-second
> background gap — confirmed on device, where backgrounding advances the figure
> by the real elapsed time rather than losing it. Criterion 3 retired with the
> rest timer.
>
> **A hold longer than its target cannot be logged from the timer.** Recording
> at zero and continuing past zero cannot both be true; §8 records the trade,
> and §7.3's inline set edit covers it.
>
> **The smoke test is closed.** K2 — the force-quit race repeated at varying
> speed — passes on a human thumb, which is the only way it could. L2 through L6
> are answered as fine for now, with interface refinement deferred until the
> application is functionally complete; they are recorded as deferred rather
> than audited, because that is what they are.
>
> **Phase 6 — Completion Flow & Quick Log. Closed 8 Aug 2026**, branch
> `phase-6-completion`. The review between the last set and history, the target
> raise prompt, and quick log.
>
> **A raised target had nowhere to land.** §6.6 makes the prompt the only
> mechanism by which a target increases, so it has to write to the template
> slot — but an entry recorded the exercise and a snapshot of the targets and
> never which slot it came from, and §5.2 lets one exercise fill two slots with
> different targets. Matching on the exercise is a guess; matching on display
> order breaks the first time a slot is reordered. Phase 5 met the same gap from
> the other side when the rest timer was cut. Migration 0005 adds
> `template_slot_id` as **provenance, not a target source** — nothing reads a
> target through it, which is what keeps invariant 5 intact.
>
> `lib/completion.ts` holds the majority rule, pure and tested, for the reason
> `lib/timers.ts` is pure: a rule that lives inside a query is a rule nobody can
> test, and a raise firing on one lucky set would rewrite the program on the
> strength of a fluke.
>
> **A raise may never be a lowering.** The prompt measures against what was
> trained against, override included, but writes only when the best set also
> beats what the slot currently says. §6.6 amended, along with §2 — which still
> listed `rest_seconds`, missed by Phase 5's sweep.
>
> Quick log writes a session's rows through the same `logSetIn` the session
> screen uses, so exit criterion 4 holds by construction rather than by two
> functions currently agreeing.
>
> **All exit criteria verified on the Pixel 7a** (`SMOKE_TEST.md` M, N, O).
> DoD 6, DoD 7 and DoD 8 pass. The two cases that decide whether the raise is
> trustworthy both hold: a target beaten once out of three offers nothing (N2),
> a tie offers nothing (N3), a target overridden downward and then beaten does
> not lower the template (N4), and the same exercise in two slots raises each
> independently (N5) — the case the phase was built around. Migrations 0004 and
> 0005 both applied on a cold start; no `kg` metric survives.
>
> **Two findings, queued below rather than fixed here.** The untrained warning
> reads as a comma-separated sentence where a list would scan (M1), and Back
> from the quick-log fields leaves the screen entirely instead of returning to
> the exercise list (O3).
>
> **Phase 6 follow-ups — Leaving a screen. Closed 9 Aug 2026**, branch
> `phase-6a-leaving`, merged to `main`. Every writing screen is now either a
> draft ending in Discard/Save or a set of immediate actions ending in Done, and
> §18 says which is which. `lib/use-draft-exit.ts` owns the on-screen Back *and*
> the Android system back from one place, because guarding one and not the other
> loses work silently.
>
> **The blocker on write-on-save was a misreading.** The Phase 4 data-loss bug
> was write-on-**blur** — with `keyboardShouldPersistTaps="handled"` a tap on
> Back reaches the button without blurring the field, so `onBlur` never fires.
> A Save button never consults blur, so the bug argues *for* write-on-save
> rather than against it. §4.5 records the correction.
>
> **Training writes as you type; planning waits for Save.** The per-exercise and
> session notes keep writing per keystroke — losing a set is the invariant, and a
> note typed mid-session is training. Everything else is a draft.
>
> A follow-up pinned `Done` to the bottom of the add-exercise screen and
> acknowledged the tap synchronously. The lag was never SQLite: 200 reads
> measured 21ms. It was a list of 41 rows with no response to being touched.
>
> **Phase 7 — History. Closed 10 Aug 2026**, branch `phase-7-history`. The
> timeline, the session detail, edit and soft delete. Both exit criteria verified
> on the Pixel 7a: a set with one metric recorded and one not reads back
> `10 reps · —`, and a paused session reports a duration excluding the pause.
> Five sessions' durations match `completed_at − started_at −
> accumulated_pause_ms` exactly against the pulled database.
>
> Quick logs appear in the timeline, titled with their exercise and marked, so
> that training which is recorded is never invisible. §11.5 keeps them out of the
> dashboard's sessions *figure*, which is where the distinction matters.
>
> `SMOKE_TEST.md` U and V — edit, delete, and the two things history must not do
> — were run on device and pass, reported rather than written into the file.
> Recorded here so the gap is in one place rather than looking unrun forever.
>
> **Phase 8 — Exercise Details & Records. Built 10 Aug 2026**, branch
> `phase-8-records`. One movement across its whole life: every set ever logged
> with its session and date, personal records per metric, and the sessions it
> appeared in.
>
> **§4.3 is settled, and the answer was no driver.** The question assumed the
> ranking would live inside a query. It does not — the queries fetch rows,
> `lib/records.ts` folds them, and eighteen tests over three-line fixtures cover
> the exit criterion's ties and nulls without a native devDependency. What stays
> untested is the queries' own soft-delete filtering, recorded rather than
> glossed.
>
> **A tie keeps the earlier holder.** Matching your best is not beating it — the
> rule §6.6 already applies to the raise prompt. Null is never a candidate and
> zero always is, which is invariant 2 read from both sides.
>
> **The best-set trend moved to Phase 9** (`FEATURES.md` §10.2). It was the
> first thing in the project to want a chart, and installing victory-native and
> Skia for one sparkline would have settled the dashboard's charting stack as a
> side effect of an exercise screen.
>
> **Not yet verified on hardware.** `SMOKE_TEST.md` W carries the device pass;
> criterion 1 is DoD 10 and needs a thumb.
>
> **Next: verify W, then Phase 9 — Dashboard.**

Update this block when a phase closes. It is the first thing read at the start
of a session.

---

## 0. Status of This Document

This document is the **single source of truth for sequencing**. It decides
*when* things are built, never *what* or *how*.

| Question | Document |
|---|---|
| What gets built | `FEATURES.md` |
| What it is built with | `TECH_STACK.md` |
| What it looks like | `DESIGN.md` |
| What order it is built in | **This document** |

Where this document appears to describe a feature, it is summarising one defined
elsewhere. If it conflicts with the other three, **they win** and this document
is wrong and should be corrected.

### 0.1 Working Agreement

- **One phase at a time.** Do not start a phase before the previous one's exit
  criteria pass.
- **A phase closes on its exit criteria, not on its code existing.** "The screen
  renders" is not an exit criterion. "Force-quitting mid-set loses nothing" is.
- **Nothing from `FEATURES.md` §14 (Deferred) or §15 (Cut) is scaffolded**, not
  even as a placeholder, not even behind a flag.
- **Schema changes get a generated migration in the same commit.** After any
  edit to `db/schema.ts`, run `npx drizzle-kit generate`.
- An open question in §4 that blocks a phase is **answered before that phase
  starts**, not worked around.

### 0.2 Phase Overview

| # | Phase | Closes DoD |
|---|---|---|
| 0 | Repository & toolchain | — |
| 1 | Database foundation | — |
| 2 | Exercises | 9 |
| 3 | Templates | 1 |
| 4 | Active session & logging | 2, 3, 5 |
| 5 | Timers | 4 |
| 6 | Completion flow & quick log | 6, 7, 8 |
| 6a | Follow-ups — leaving a screen | — |
| 7 | History | — |
| 8 | Exercise details & records | 10 |
| 9 | Dashboard | 11 |
| 10 | Export & settings | 12 |
| 11 | Build, icons & store prep | — |

"DoD" refers to the twelve items in `FEATURES.md` §16. All twelve are accounted
for. Phases 0, 1, 7 and 11 close none of them directly — they are foundation,
and history is the substrate the later payoff phases read from.

---

## 1. Phases

### Phase 0 — Repository & Toolchain

Everything needed before a single feature can be written.

- Expo SDK 57 managed app, TypeScript with `strict: true` and
  `noUncheckedIndexedAccess: true`
- Expo Router, typed routes, `(tabs)` shell with Home / History / Exercises as
  empty screens
- NativeWind v4 — **every** token from `DESIGN.md` §3–§7 as CSS variables in
  `global.css`, mapped in `tailwind.config.js`. Both themes. This happens once,
  completely, so no later phase is tempted to invent a value.
- Geist and Geist Mono bundled via `expo-font`, loaded in the root layout with
  the splash screen held until ready
- `lucide-react-native`
- Lint, test runner (see §4.3), npm scripts per `CLAUDE.md`
- `eas.json` with `development`, `preview`, `production` profiles

**Creates:** `app/_layout.tsx`, `app/(tabs)/`, `global.css`,
`tailwind.config.js`, `tsconfig.json`, `eas.json`, `assets/fonts/`

**Exit criteria**

1. `npx tsc --noEmit` and `npm run lint` are clean.
2. The app boots on a device to an empty screen using `bg` and `text`.
3. Toggling the system theme flips the screen with no component containing a
   theme conditional.
4. Text renders in Geist with no frame in a fallback face.

---

### Phase 1 — Database Foundation

The invariants live or die here. Get this wrong and every later phase inherits
it.

- `db/schema.ts` — all nine tables exactly as `FEATURES.md` §2. UUID v7 primary
  keys via the `uuidv7` package, `created_at` / `updated_at` as integer epoch
  millis, nullable `deleted_at` on every user-owned table.
- `lib/ids.ts` — the single call site for ID generation
- First `drizzle-kit generate` migration, bundled and applied on launch
- `db/seed.ts` — the built-in catalogue with families and metrics, roughly
  fifteen `is_active` per `FEATURES.md` §3.2, the rest dormant. Idempotent,
  guarded by a flag row in `meta`, run on first launch and never by a migration.

Note that `sets` stores no measurements. `set_metric_values` holds them, one row
per metric. Do not collapse this into columns.

**Creates:** `db/schema.ts`, `db/migrations/`, `db/seed.ts`, `db/client.ts`,
`lib/ids.ts`

**Exit criteria**

1. A fresh install runs the migration and seeds the catalogue.
2. A second launch adds nothing — row counts are identical.
3. Soft-deleting a built-in exercise and relaunching does not resurrect it.
4. Generated IDs are v7 — sorting by `id` matches sorting by `created_at`.

---

### Phase 2 — Exercises

The first real surface, and the one with the least risk. It exercises the
schema, the tokens and the query/mutation split before anything time-critical
depends on them.

- Exercises tab: the active library
- Exercise detail: name, family, notes, ordered metric configuration. History
  and records arrive in Phase 8.
- Create a custom exercise; add, reorder and soft-delete metrics. The first
  metric is the primary metric and will drive the logging UI in Phase 4.
- Archive and soft delete
- **Suggested** section beneath the library: inactive catalogue exercises whose
  `family` matches something already active, in a lighter tone, one tap to
  activate, dismissible per exercise, never shown during a session

**Creates:** `db/queries/exercises.ts`, `db/mutations/exercises.ts`,
`app/(tabs)/exercises.tsx`, `app/exercise/[id]/`, `features/exercises/`

**Blocked by:** open question §4.1 — dismissal has nowhere to persist.

**Exit criteria**

1. **DoD 9** — activate a suggested exercise from the catalogue.
2. A dismissed suggestion does not return after a relaunch.
3. Editing an exercise's metrics leaves existing `set_metric_values` untouched.
4. No colour, spacing or radius literal appears anywhere in the phase's code.

---

### Phase 3 — Templates

Small, and entirely outside training. Built before sessions because a session
starts from one.

- Template list; create, rename, delete
- Slots: add an exercise, remove, reorder
- Per slot: `target_sets`, `target_metric_id` + `target_value`

**Creates:** `db/queries/templates.ts`, `db/mutations/templates.ts`,
`app/template/`

**Exit criteria**

1. **DoD 1** — create a template with exercises and targets.
2. ~~A slot with `rest_seconds` null saves and reads back as null, not 0.~~
   **Retired in Phase 5** with the rest timer (`FEATURES.md` §15); the column is
   dropped by migration 0003. It passed when it applied. The null-versus-zero
   rule it tested is invariant 2 and still holds everywhere else — `lib/parse.ts`
   and its tests are where it lives now.

---

### Phase 4 — Active Session & Logging

The reason the application exists. Sets get forgotten when tired; this phase is
what stops that. It is the largest phase and should not be trimmed to reach the
next one.

- Start from a template — targets **snapshotted** onto `exercise_entries` at
  start, so later template edits never rewrite history. Ad-hoc start with no
  template.
- Session screen: ordered exercise list, each row carrying a `2 / 4` counter
  visible **without opening the exercise**. This specific element is the fix for
  the original problem.
- Exercise screen: target, and "last time" scoped to this template, falling back
  to the most recent occurrence anywhere with the source labelled.
- Number-primary logging: numeric fields, large tap targets, save
- Inline set edit and delete, during and after the session
- `to_failure` on every set
- Add an ad-hoc exercise mid-session; the template is untouched
- Tap the target to override it **for this session only**
- One note per exercise entry
- Zustand for ephemeral state only — current exercise index, unsaved draft.
  Every write commits to SQLite **before** the UI transitions.
- `expo-keep-awake` for the session's duration; haptics on set saved and target
  reached
- On launch with an unfinished session: Resume · Complete it now · Discard, with
  a second confirmation on discard
- Explicit pause only, accumulating into `accumulated_pause_ms`. Leaving the
  application is not pausing.

**Creates:** `db/queries/sessions.ts`, `db/mutations/sessions.ts`,
`db/mutations/sets.ts`, `stores/session.ts`, `app/session/`, `features/session/`

**Blocked by:** open question §4.2 — the entry does not snapshot which metric
its target refers to.

**Exit criteria**

1. **DoD 2** — start a session from a template.
2. **DoD 3** — log sets quickly with last session's values visible.
3. **DoD 5** — leave the application and return with the session intact.
4. Force-quitting immediately after saving a set loses nothing.
5. Editing a template does not alter any completed session.
6. An unrecorded value reads back as null and displays as `—`.

---

### Phase 5 — Timers

Split from Phase 4 because the correctness rules are testable in isolation and
worth getting right on their own.

- `lib/timers.ts` **written test-first** — elapsed time derived from a start
  timestamp, pause accumulation, resume after backgrounding. Never accumulated
  `setInterval` ticks.
- Hold timer: the duration-primary logging UI. One large card, tap to start,
  tap to stop, set recorded, tap again for the next. Fifteen holds in three
  minutes with no typing. Manual entry stays possible.
  - With a duration target it counts **down** and records at zero, so a set of
    three holds is three taps. Without one it counts up.
- `expo-audio` beep and a haptic when a target is reached

**The rest timer is cut** (`FEATURES.md` §15), and `expo-notifications` with it.
A countdown pushing you back to the bar works against an unhurried two-hour
session. That removes the scheduling, cancelling and deliver-to-a-killed-app
machinery, which was the largest and most failure-prone part of this phase.

**Creates:** `lib/timers.ts`, `lib/timers.test.ts`, `lib/sound.ts`,
`features/session/hold-timer.tsx`

**Exit criteria**

1. **DoD 4** — time a hold without leaving the application.
2. Unit tests pass, including a 90-second background gap resuming at the correct
   elapsed time.
3. ~~The rest notification fires with the application killed.~~ **Retired with
   the rest timer.**
4. The timer conveys state through the figure and a hairline track — never a
   colour change.

---

### Phase 6 — Completion Flow & Quick Log

- On finishing, warn about exercises with **zero sets logged**, bypassable in
  one tap. Do not warn about exercises merely short of target. Informational
  tone — `text-2`, never `danger`.
- Target raise prompt, at completion only, offered only when the target was
  beaten on the **majority** of sets. One tap. Ignoring it changes nothing.
  This is the only mechanism by which a target increases.
- Optional session note
- Quick log: pick exercise, enter values, done. Auto-completed,
  `is_quick_log = true`, no session screen shown.
- Exercises with zero sets read as `not trained`, never as zeros

**Exit criteria**

1. **DoD 6** — be warned about untrained exercises before finishing.
2. **DoD 7** — raise a target in one tap when it was beaten.
3. **DoD 8** — quick-log five pull-ups outside of training.
4. A quick log produces the same row shapes as a session — one code path
   downstream.

---

### Phase 6 follow-ups — Leaving a screen

**Closed 9 Aug 2026**, branch `phase-6a-leaving`. Raised from use, in the same
way the Phase 4 follow-ups were raised from the smoke test. §4.5 settled it:
**write on save**, with the training loop excepted. `FEATURES.md` §18 is the
rule; `lib/use-draft-exit.ts` is the enforcement.

**The complaint:** you press Back far more often than the application takes you
anywhere. Adding exercises to a template, then setting a slot's target, both end
with a manual Back rather than an action that means "done".

**The cause: two navigation models coexist.** Some screens are a form with a
terminal button that navigates — `template/new.tsx`, `exercise/new.tsx`,
`exercise/[id]/edit.tsx`'s draft, `quick-log.tsx`, `complete/[id].tsx`. Others
commit as you type and can only be left by pressing Back. Nothing marks which
kind a screen is, so every screen has to be learned.

What each screen became:

| Screen | Was | Now |
|---|---|---|
| `app/slot/[id].tsx` | Sets and target per keystroke, **no button anywhere** | Draft. One `setSlotPlan` write instead of two that could disagree. |
| `app/template/[id]/add.tsx` | Each tap adds a slot, no Done | Action + `Done`. |
| `app/template/[id]/index.tsx` | Name per keystroke | Name is a draft with its own Save; the acts stay immediate. |
| `features/exercises/metric-editor.tsx` | Rename per keystroke | Rename is a draft that reports upward to the screen's guard. |
| `app/exercise/[id]/edit.tsx` | One Save under both halves | Draft actions inside the draft's section; metrics end in `Done`. |
| `app/exercise/[id]/index.tsx` | Archive silent, Delete confirmed | Both confirm. |
| `app/quick-log.tsx` | On-screen Back overridden, system back not | Both agree — **O3 fixed**. |
| `app/entry/[id].tsx`, `app/complete/[id].tsx` notes | Per keystroke | **Unchanged** — the §18 training exception. |

`updateSlot` had no callers once the slot screen saved once, and went in the
same commit that orphaned it.

**M1** is fixed: the untrained warning is a list, not a comma-separated
sentence, on the one screen whose job is to say which exercises were missed.
`app/slot/[id].tsx`'s docstring no longer describes the cut rest timer.

**Exit criteria**

1. Every screen that writes states how it is left, and the answer is the same
   kind of answer everywhere. — **met**, `FEATURES.md` §18.
2. The Android system Back does what the on-screen control does, including any
   confirmation. — **met and verified on device** for the slot screen: system
   back raises the prompt, Cancel keeps the draft, Discard leaves the row
   untouched in the database, Save writes and navigates.
3. No screen both commits immediately and offers a Save that implies otherwise.
   — **met and verified**: `Save details` no longer reads as owning the metric
   list.

**All three criteria verified on the Pixel 7a.** `SMOKE_TEST.md` P, Q, R and S
pass: the exercise editor's split, a metric rename reaching the guard, adding a
metric raising no prompt, both confirmations, quick log's back returning to the
exercise list rather than Home (**O3 closed**), and — S — the training notes
still writing as you type rather than having quietly become drafts.

**Follow-up, from using it.** `Done` went into the list footer, so finishing the
add screen meant scrolling past every exercise to reach it — the problem the
screen was built to solve, moved rather than removed. `Screen` gained a `footer`
that pins an action row above the safe area and inside the keyboard avoider.

Adding an exercise also read as slightly slow. **Measured against the pulled
database, it is not the write:** the read `addSlot` performs runs in about
0.1ms. Nothing acknowledged the tap, and the `× 2` tally cannot appear until the
write has landed and the query has re-run — so a haptic fires in the press
handler, which is the only acknowledgement available in the same frame as the
tap. `FEATURES.md` §7.6 amended for the fourth haptic; the row is memoised so
one add no longer re-renders every visible row.

Verified on device: `Done` renders at y2209 of a 2400px screen on arrival, holds
**identical** bounds after the library is scrolled to its end, and moves to
y1326 when the search field takes the keyboard. The haptic's call site is
verified; the sensation is not something a script can confirm.

**Phase 6a is closed. Next: Phase 7 — History.**

---

### Phase 7 — History

- Reverse-chronological timeline of completed sessions: date, name, duration,
  exercise count
- Session detail: everything logged, per set, with notes
- Edit and delete a completed session. Deleting removes its entries and sets;
  the exercises remain.

Calendar, search and filters stay deferred. A scrolling list is sufficient at
this volume.

**Creates:** `db/queries/history.ts`, `app/(tabs)/history.tsx`,
`features/history/`

**Exit criteria**

1. A completed session reads back exactly as logged, including nulls as `—`.
2. Session duration excludes `accumulated_pause_ms`.

**Closed 10 Aug 2026**, branch `phase-7-history`.

Everything the application recorded was write-only past the moment a session
ended. This is the surface that reads it back, and the substrate Phases 8 and 9
read from — which is why it closes no Definition-of-Done item.

`sessionLengthMs` lives in `lib/history.ts` rather than beside its query, for
the reason `lib/completion.ts` does: `db/queries/` imports the client, the
client imports `expo-sqlite`, and the runner cannot open it. Criterion 2 is the
kind of thing that should not be inlined into a component.

`formatSetValues` gained a `missing` option rather than changing behaviour
everywhere. History shows `—`; training keeps omitting, which is what makes rows
scannable mid-set. Same invariant, different priority.

The detail screen is separate from `app/session/[id].tsx` deliberately —
`DESIGN.md` §10 rule 4 says the active session screen carries the least chrome
of any screen, and §9 wants dates, durations and notes.

**Verification is partial and the gap is recorded.** Verified by script on the
Pixel 7a: the timeline renders and groups by day, quick logs are titled with
their exercise and marked, five sessions' durations match
`completed_at − started_at − accumulated_pause_ms` **exactly** against the pulled
database, and the detail screen renders every set with `Not trained` where an
exercise has none.

**Both exit criteria closed on device 10 Aug 2026.** The gap recorded above was
data, not code: criterion 1's dash needs a set with one metric recorded and
another not, and criterion 2 needs a session with a nonzero pause, neither of
which existed on the device. Both were created by hand and both read back
correctly — `SMOKE_TEST.md` T1 and T3.

`SMOKE_TEST.md` U and V — edit, delete, and the two things history must not do
(offer a logging UI for a finished session, hold the screen awake while reading
one) — were run on device and pass. Reported rather than written into the file,
which is why its `Observed:` lines are empty.

---

### Phase 8 — Exercise Details & Records

The payoff for making Exercise permanent. Spans **all** templates and includes
quick logs.

- Every set ever logged, newest first, with its session and date
- Personal records per exercise **per metric** — most reps, longest hold. A
  duration PR and a rep PR are separate.
- Best-set trend over time
- Which sessions it appeared in
- Its metric configuration

Aggregation and PR queries are unit tested. They are computed at read time;
nothing is cached or stored.

**Creates:** `db/queries/records.ts`, `db/queries/aggregate.ts`, their tests

**Exit criteria**

1. **DoD 10** — browse history and one exercise's full record.
2. PR queries pass unit tests, including ties and nulls.
3. No aggregate value exists in any table.

**Built 10 Aug 2026**, branch `phase-8-records`.

`db/queries/aggregate.ts` was not created and is not missing. The reads it was
going to hold are three rooted queries in `records.ts`, and the only thing that
aggregates is a fold in `lib/records.ts`. A second query file would have been a
name with nothing behind it.

**§4.3 settled without a driver.** The ranking is pure, so the exit criterion's
"ties and nulls" are eighteen tests over fixtures rather than a native
devDependency and a migration harness. The cost is that the queries' soft-delete
filtering stays untested; §4.3 records it.

**The trend moved to Phase 9** (`FEATURES.md` §10.2). It was the first thing in
the project to want a chart, and installing `victory-native` + Skia for one
sparkline would have decided the dashboard's charting stack as a side effect of
an exercise screen.

Three roots rather than one join, for the reason every read layer here gives:
`sessions` moves on rename and delete, `sets` on logging and deleting, and
`set_metric_values` on a correction from history. `exercise_entries` needs no
root of its own — nothing soft-deletes an entry, which was checked rather than
assumed.

**Verification is unrun on hardware.** 111 unit tests pass, `tsc` and lint are
clean. `SMOKE_TEST.md` W carries the device pass; criterion 1 is DoD 10 and
needs a thumb.

---

### Phase 9 — Dashboard

Built in the shipping order of `FEATURES.md` §11.7, **not** the presentation
order of §11.3 — four of the five blocks are near-empty for the first month.

1. **Not trained recently** — three to five active exercises by days since last
   logged. Useful from week two.
2. **Recent records** — PRs set in the last 30 days. Stated, never
   congratulated.
3. **This week** — sessions and sets. Two numbers, small type, not a hero.
4. **Last 7 days** — seven dots, filled if trained. Filled versus hollow, not
   two colours. No number attached. This is not a streak.
5. **Sessions per week** — 12-week bar chart. Says nothing until roughly three
   months of data exist; may land in Phase 11. Bars are neutral; the accent does
   not appear in charts.

Counting rules: quick logs count toward sets, records and days-since-trained but
**never** the sessions figure. Ad-hoc sessions do count.

**Exit criteria**

1. **DoD 11** — see what has not been trained recently.
2. A quick log does not increment the sessions figure.
3. Blocks 1, 2 and 4 render correctly with a single week of data.
4. Nothing on the screen is celebratory and nothing animates.

---

### Phase 10 — Export & Settings

With no cloud in v1 this is the only backup. Non-negotiable.

- `lib/export.ts` — full JSON export of the entire database via
  `expo-file-system`, handed to the OS share sheet via `expo-sharing`
- Format designed so import is possible later, though import is deferred
- Serialisation round-trip unit tested
- Appearance setting: system / light / dark

**Creates:** `lib/export.ts`, `lib/export.test.ts`, `app/settings.tsx`

**Blocked by:** open question §4.4 — the theme override needs a storage
dependency not yet listed in `TECH_STACK.md`.

**Exit criteria**

1. **DoD 12** — export everything to a file.
2. A round-trip preserves every row, including nulls and soft-deleted rows.
3. Export completes in airplane mode.

---

### Phase 11 — Build, Icons & Store Prep

- Local EAS builds across all three profiles; a `preview` `.apk` installed on a
  real device
- Icon, adaptive icon and splash — the open items in `DESIGN.md` §12
- Privacy policy URL; App Privacy and Data Safety disclosures
- The 12-week sessions chart, if it did not land in Phase 9

**Exit criteria**

1. A preview build installs and runs on a physical device.
2. All twelve Definition-of-Done items pass **without reading documentation**.
3. The application works fully in airplane mode from install onward.

---

## 2. Test Coverage by Phase

Unit tests only. Per `TECH_STACK.md` §8, the logic that can silently corrupt
years of training history is worth testing; layout is verified by looking at it.

| Phase | Under test |
|---|---|
| 5 | `lib/timers.ts` — timestamp arithmetic, pause accumulation, background resume |
| 8 | Aggregation and personal-record queries |
| 9 | Dashboard counting rules, particularly quick-log exclusion |
| 10 | Export serialisation round-trip |

**Not tested:** components, navigation, screen rendering, snapshots, E2E.

---

## 3. Long Poles — Start Early

These are calendar-bound and do not care which phase is in progress.

| Item | Lead time | Start by |
|---|---|---|
| Google Play closed test — 12 opted-in testers for 14 continuous days before production access applies to personal accounts created after 13 Nov 2023 | 2+ weeks after the track opens, plus recruiting | Phase 4 |
| Apple Developer Program membership | Days, occasionally longer | Phase 8 |
| Privacy policy hosted at a public URL | Hours | Phase 10 |

The Play closed-testing gate is the longest pole on the Android timeline. Open
the track and recruit while the application is still being built, not after.

---

## 4. Open Questions

Gaps found in the source-of-truth documents. Each blocks a phase. Resolving one
means **amending the owning document**, not deciding locally — `FEATURES.md` and
`TECH_STACK.md` are authoritative.

### 4.1 Suggestion dismissal — settled

Nullable `suggestion_dismissed_at` on `exercises`, in the first migration.
`FEATURES.md` §2 amended.

### 4.2 Target's metric on `exercise_entries` — settled

`target_metric_id` is snapshotted onto `exercise_entries` alongside
`target_value`, in the first migration. `FEATURES.md` §2 and §2.1 amended.

### 4.3 Database-under-test — settled

**Runner settled: Vitest**, recorded in `TECH_STACK.md` §8.

**Settled in Phase 8: no driver.** The question assumed the ranking would live
inside a query, and it does not. `db/queries/records.ts` fetches rows;
`lib/records.ts` folds them; the fold is where every rule that could be wrong
lives, and it takes fixtures three lines long. `better-sqlite3` would have
bought a native devDependency, a migration-apply harness and a way to swap the
module-level `db` singleton under test — to test SQL that decides nothing.

This is the same split `lib/completion.ts` and `lib/history.ts` already use, for
the same reason: `db/` imports the client, the client imports `expo-sqlite`, and
the runner cannot open it.

**What it leaves untested is the `isNull(deleted_at)` filtering in the queries
themselves.** A forgotten soft-delete predicate would show a deleted set as a
record and no unit test would catch it. Recorded in `lib/records.ts` rather than
glossed over, and cheap to revisit if it ever bites — the fold does not change
if a driver arrives later.

### 4.4 Dependencies not yet justified in `TECH_STACK.md` — Phases 9 and 10

- `victory-native` v41+ requires `@shopify/react-native-skia`, plus reanimated
  and gesture-handler. §6.3 lists the latter two; Skia is unlisted.
  **Phase 8 declined to pre-empt this.** §10's best-set trend was the first
  thing to want a chart; rather than install a charting stack for one sparkline,
  or draw one by hand in `react-native-svg` and set a precedent for the
  dashboard, the trend moved to Phase 9 where one decision covers both.
  `FEATURES.md` §10.2 records it.
- The appearance override needs persistent local storage —
  `@react-native-async-storage/async-storage` per §5, which names AsyncStorage
  but does not list the package.

§13 requires every dependency be justifiable in one sentence there. Add them
before installing.

### 4.5 How a screen is left, and whether Discard is possible — settled

**Settled: write on save, with the training loop excepted.** `FEATURES.md` §18
now defines the two patterns and the exception; this section records why the
choice was available at all.

**The blocker was smaller than it first looked, because the objection was
wrong.** The Phase 4 defect was write-on-**blur**, not write-on-save. With
`keyboardShouldPersistTaps="handled"` a tap on Back reaches the button without
dismissing the keyboard, so a focused field never blurs and `onBlur` never
fires. A Save button never consults blur — it reads state in its own handler,
and that same prop is what lets it be pressed once rather than twice with the
keyboard up. Write-on-save is the pattern the defect argues *for*.

What did have to be solved was edits being walked away from, and the exit
surface turned out to be two doors: our own `BackButton`, and the Android system
back. No native header back exists (`headerShown: false`), native-stack has no
Android swipe-back, and `enableOnBackInvokedCallback="false"` keeps the legacy
`BackHandler` authoritative. `lib/use-draft-exit.ts` owns both.

`usePreventRemove` was not used: expo-router vendors its navigation core and
does not re-export it, so reaching it means importing from `expo-router/build/`,
a path a patch release may move.

Kept below as written, since the options were real when they were weighed.

Commit-as-you-type is not incidental and must not be undone casually. It is the
fix for the Phase 4 defect: `keyboardShouldPersistTaps="handled"` means a
focused field never blurs when Back is tapped, so six commit-on-blur fields
silently discarded their edits. Writing on every keystroke is also what
invariant 1 asks for everywhere else.

So offering **Save / Discard** means choosing one of:

- **(a) Buffer edits and write on Save.** Reintroduces the defect above unless
  the screen also blocks the system back. Rejected unless the back handling
  lands first and is proven.
- **(b) Keep writing as you type; Discard restores a snapshot** taken when the
  screen opened. Safe, keeps invariant 1, costs one snapshot per editing screen
  and a decision about what "the screen opened" means for a live query.
- **(c) Keep writing as you type; add only a Done that navigates.** Answers the
  actual complaint — the manual Back — and offers no discard at all.

(c) is the cheapest and (b) is the honest one where a mistake is expensive.
Whichever is chosen applies to **every** screen in the table above, because the
point is that a screen no longer has to be learned individually.

`FEATURES.md` gains a section for the decision; this document only sequences it.

---

## 5. Change Log

| Date | Change |
|---|---|
| Aug 2026 | Created. Twelve phases defined from empty repository to Definition of Done. Four open questions recorded against the other source-of-truth documents. |
| Aug 2026 | Phase 0 built. Test runner settled on Vitest, closing half of §4.3; the rest deferred to Phase 8. |
| Aug 2026 | Phase 1 built. §4.1 and §4.2 settled and folded into the first migration; `FEATURES.md` §2 amended for both. |
| Aug 2026 | Phase 2 closed. `docs/DEVELOPMENT.md` added as a per-step build record. Two `useLiveQuery` constraints found and recorded: it subscribes to one table only, and cannot distinguish "no rows" from "not read yet". `$onUpdateFn` added to the schema's lifecycle columns — runtime only, no migration. `archivedExercises` added beyond `FEATURES.md`, since archiving with nowhere to see the result is a one-way door. |
| Aug 2026 | Phases 0 and 1 closed against a running emulator. Two defects surfaced only by running it: `expo-splash-screen` emits a `windowSplashScreenAnimatedIcon` reference for a colour-only splash but never generates the drawable, failing the Android build — worked around by `plugins/with-splash-no-icon.js` until artwork lands in Phase 11. And the custom tab bar called `useSafeAreaInsets`, which the navigator invokes as a plain function inside a context consumer, so every screen rendered blank; it takes `insets` from props now. |
| Aug 2026 | Phase 2 follow-ups. Two Phase 2 exports turned out to have no call site — `archivedExercises` and `updateMetric` — so archiving was one-way and metrics could not be renamed. Both given surfaces. `FEATURES.md` §3.3 amended: archived exercises still count toward owned families, because archiving is usually a graduation. §3.5 amended to name the Archived screen. Records that exit criteria only test paths someone built, so dead code passes them. |
| Aug 2026 | Phase 3 built. `FEATURES.md` §5 amended — templates live on Home, templates themselves do not reorder, and deleting one takes its slots. `renumber` extracted to `db/mutations/ordering.ts` now that two tables carry a user-arranged `display_order`. `lib/parse.ts` added: an empty field is null, `0` is zero, and the rest-timer criterion is exactly that distinction. Harness note: Metro serves a stale route tree after a route file moves, presenting as a blank screen with no JS error. |
| Aug 2026 | Phase 4 built. Targets snapshotted onto `exercise_entries` at session start, which makes "editing a template never rewrites history" true by construction. `expo-keep-awake` and `expo-haptics` added — both native, so the dev client needed a full rebuild. Two harness lessons: `adb input tap` returns on injection rather than on handling, so the force-quit race cannot be scripted; and screenshot byte size is a useless readiness signal next to `uiautomator dump` matched on app text. |
| Aug 2026 | Phase 4 follow-ups, from a full smoke test on a physical Pixel 7a. Three lessons worth keeping. **Fixing the keyboard caused a data-loss bug**: `keyboardShouldPersistTaps="handled"` sends a tap on Back to the button without dismissing the keyboard, so a focused field never blurs and six commit-on-blur fields discarded their edits — commit-on-blur was the defect, and all six now write as you type, which is what invariant 1 asks for everywhere else. **The metric editor was rebuilt rather than patched a fourth time**: three fixes had each addressed a symptom of one cause, that the screen asked the user to compose name, type and unit, and `number` covers both a count and a load. **A picker built from `SELECT DISTINCT` can only be as clean as the data it is meant to constrain** — it offered every typo ever made. `FEATURES.md` §4.1 rewritten around four whole metrics, convertible until the first set is logged against them. Harness: `expo-sqlite` lives at `files/SQLite/`, a release APK never contacts Metro, and a migration added mid-session does not apply until a cold start because `useMigrations` runs on mount and Fast Refresh does not remount the root. |
| Aug 2026 | Phase 5 built, and the rest timer cut before it was. A countdown pushing you back to the bar works against an unhurried two-hour session; that removed `expo-notifications` entirely and settled a problem the phase would otherwise have had to solve, since `exercise_entries` has no `rest_seconds` and an entry could no longer find its slot unambiguously once one exercise was allowed to appear twice in a template. Migration 0003 drops the column. `lib/timers.ts` is pure with `now` as a parameter throughout, which is what makes "returning after ninety seconds shows the correct elapsed time" a unit test rather than a wait. An interval repaints but never accumulates. Recording at zero was chosen knowing it caps a hold at its target — the two cannot both be true, and §7.3's inline edit covers the rest. Harness note: `expo-audio` is absent from React Native's autolinking manifest and ungreppable in `classes.dex`, but so is `expo-haptics`, which works; `expo-modules-autolinking resolve` is what answers that question. |
| Aug 2026 | Phase 6 built. The phase turned on one thing the data model could not answer: a raised target has to write to a template slot, and an entry never recorded which slot it came from — the exercise cannot say, because one exercise may fill two slots with different targets. `template_slot_id` answers it as provenance only; reading a target through it would undo the snapshot that makes invariant 5 true. Two rules were sharpened by writing them down: a majority is strictly more than half and a tie is not a beat, and **a raise may never be a lowering**, so the write is gated on the slot's own figure rather than on the possibly-overridden target that was trained against. Quick log shares `logSetIn` with the session screen, which is what makes "the same row shapes" a property of the code rather than a claim about it. `FEATURES.md` §2 still listed `rest_seconds` — a phase's docs sweep can update the section it was thinking about and miss the one that merely mentions the thing. |
| Aug 2026 | Added load removed (`FEATURES.md` §15). A weighted variant is its own exercise, which is how progressions are already modelled, so the metric was there by habit. It was also the last fractional value and the last unit that was not seconds, so `NumericField` lost its `step` and `keyboardType` props. Migration 0004 soft-deletes the metrics, renumbers the survivors so an exercise ordered `[Added load, Hold]` correctly promotes Hold to primary, and clears targets pointing at a load on both `template_slots` and `exercise_entries`. `set_metric_values` untouched. `CLAUDE.md` invariant 9 amended, since it named kg as a unit. |
