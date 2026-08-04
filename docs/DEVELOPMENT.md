# Development Log

**Document Type:** Record — not a source of truth.

What was actually built, in the order it was built, plus the decisions that are
not obvious from reading the code afterwards. Sequencing belongs to `PLAN.md`;
`FEATURES.md`, `TECH_STACK.md` and `DESIGN.md` remain authoritative for what,
with what, and how it looks. Where this file disagrees with one of them, they
win and this file is out of date.

Phases 0 and 1 predate this log — see the `PLAN.md` change log for those.

---

## Phase 2 — Exercises

Branch: `phase-2-exercises`

### Step 1 — UI primitives

Added `lib/utils.ts` and, in `components/ui/`: `text`, `button`, `input`,
`list-row`, `separator`, `section-label`, `empty-state`. One token added to
`tailwind.config.js`: `scale.press = 0.98`, so DESIGN.md §6.1's press feedback
has a name instead of an arbitrary value.

New dependencies: `class-variance-authority`, `clsx`, `tailwind-merge`.

**The CLI could not be used.** `react-native-reusables`' `add` command requires
an interactive init, and that init scaffolds project configuration — it would
have rewritten `global.css` and `tailwind.config.js`, which is the entire
Phase 0 token set. The components were taken from the registry the CLI reads
(`reactnativereusables.com/r/nativewind/{name}.json`) and copied in by hand.
Same source, same owned-code outcome, without a scaffolder near the tokens.

**Almost none of the upstream styling survived, and could not have.**
`tailwind.config.js` replaces Tailwind's scales rather than extending them, so
`bg-primary`, `h-10`, `rounded-md` and `shadow-sm` are not class names in this
project — they fail to compile. Kept: the `cva` variant map, and the
`TextClassContext` that lets `Button` colour its own label. Dropped: web-only
`Platform.select` branches, shadows (§5), `size` variants (§9 puts a 48 floor
under every control), and `Text`'s shadcn type scale, which would have stood as
a second type system beside DESIGN.md §2.3. Dropping `asChild` with it avoided
a fourth dependency, `@rn-primitives/slot`.

**`tailwind-merge` needs configuring against our scales.** It ships knowing
Tailwind's defaults. Unconfigured it classifies `text-display` as a colour —
that value is absent from its font-size list — and drops it when merged against
`text-text-2`. `lib/utils.ts` restates every replaced scale and must be kept in
step with `tailwind.config.js`.

Open question, deliberately left as the document reads: §6.1 says press feedback
is "`scale(0.98)` plus `muted` fill", which applied literally means the primary
button greys while held.

### Step 2 — Read layer

Added `db/queries/exercises.ts`: `activeExercises`, `archivedExercises`,
`suggestedExercises`, `exerciseById`, `metricsForExercise`, `allMetrics`, and
the pure helper `indexMetricsByExercise`. Every function returns a query
builder for `useLiveQuery`, never a result.

**`useLiveQuery` subscribes to exactly one table — the root of the query.** Its
implementation resolves a single entity and listens for changes to that table
alone. So a list of exercises that joined in `exercise_metrics` would never
refresh when a metric was edited: the write lands in one table and the listener
watches the other. Each query is therefore rooted at the table it actually
depends on, and the two halves are joined in memory by
`indexMetricsByExercise`. This constrains every read layer after this one.

`archivedExercises` is not a surface named in `FEATURES.md`. Archiving with
nowhere to see the result is a one-way door, so it exists to make archiving
reversible.

Suggestions resolve through a subquery over the curated `family` column, never
string similarity (§3.3). Against the seeded catalogue this yields 26
suggestions across 12 families — with `Front Lever (Tuck)` active it offers
Advanced Tuck, One Leg, Straddle and Full, which is §3.3's worked example.

### Step 3 — Write layer

Added `db/mutations/exercises.ts`: `activateExercise`, `dismissSuggestion`,
`createExercise`, `updateExercise`, `archiveExercise`, `unarchiveExercise`,
`deleteExercise`, `addMetric`, `updateMetric`, `moveMetric`, `deleteMetric`.

**`updated_at` is no longer set by hand.** `$onUpdateFn(now)` was added to the
schema's lifecycle columns, so Drizzle applies it to every update and a
mutation cannot forget to bump it. This is runtime behaviour only — it emits no
DDL, and `drizzle-kit generate` confirms "No schema changes, nothing to
migrate". It is the one edit to `db/schema.ts` since Phase 1 closed.

**A metric's `type` cannot be changed, by design.** Switching a metric from
`number` to `duration` would reinterpret every `value_num` already logged
against it — the same figure silently becoming seconds instead of reps. That is
history being rewritten without anyone asking, so the operation does not exist.
Delete the metric and add another.

Reordering renumbers `display_order` as 0..n-1 across the whole live set rather
than swapping two rows. It costs one extra write and heals any gap an earlier
delete left, which keeps "the first metric is the primary metric" true rather
than approximately true.

Nothing in this file touches `set_metric_values`, and deleting an exercise
leaves its metrics alive — sets already logged point at them, and Phase 8 has
to be able to name what it is reading.

Multi-statement work is wrapped in `db.transaction`. Single `UPDATE`s are not:
SQLite commits them atomically in autocommit mode, so a transaction around one
statement is noise.

### Step 4 — Exercises tab

`app/(tabs)/exercises.tsx` — a `SectionList` over Library and Suggested, three
live queries, one `IconButton` local to the screen because §9's 48×48 floor
cannot be met by a 24px glyph on its own.

The Suggested section is omitted entirely when empty rather than rendering an
empty header, which would imply something had gone missing.

Suggestion rows show their metrics, not their family. Families are slugs —
`hspu`, `l_sit`, `core_hang` — and displaying them would need a table of
display names that is not in the seed. Not worth inventing to fill a subtitle.

Library rows are not tappable yet: the detail route does not exist until step
5, and typed routes fail the typecheck on an `href` that goes nowhere. The
empty state has no action for the same reason — creation arrives in step 6.

Verified on the emulator: the library renders 15 rows, Suggested renders the 26
predicted in step 2, activating moved a row into the library and dismissing
removed one — 26 → 24 in the database. `updated_at` moved on the activated row
and not on an untouched one, which is `$onUpdateFn` working end to end.

**Workflow note.** After a rebuild the dev client can serve a cached bundle and
show pre-change code, which looks exactly like a broken build. Check which side
is stale by fetching the bundle from Metro directly and grepping it for a
string only the new code contains. If Metro has it, relaunch the client against
the reversed port rather than debugging the app:

```
adb reverse tcp:8081 tcp:8081
adb shell am start -a android.intent.action.VIEW \
  -d "zoomies://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
```

### Step 5 — Exercise detail

`app/exercise/[id]/index.tsx` and `lib/format.ts`. Library rows now navigate
here, pushed as `{ pathname: '/exercise/[id]', params: { id } }` rather than an
interpolated string, so typed routes check the destination.

Name, family, notes, ordered metrics with the first marked `Primary`, and
archive and delete. History and records are Phase 8 and are absent on purpose.

**`useLiveQuery` cannot distinguish "no rows" from "not read yet".** `data`
starts as `[]`, so a screen reading a single row will render its empty state
for the frame before its own query answers — this one flashed "This exercise is
no longer here" over an exercise that was perfectly present. `updatedAt` is
`undefined` until the first result lands, and gating on it is the fix. Every
screen that reads one row needs this, so it belongs with the single-table rule
from step 2.

Delete confirms through `Alert.alert`. `DESIGN.md` defines no dialog, and
inventing a modal to be tokened would be a design decision rather than an
implementation one. Platform confirmation until §6 says otherwise.

Family shows as its raw slug here — `back_lever` — where the tab shows metrics
instead. On a detail screen the stored value is the honest thing to display,
and step 6 makes it editable.

Verified on the emulator: the screen renders, archiving flips the status field
and the button, and the library drops from 18 rows to 17 live.

### Step 6 — Create and edit

`features/exercises/exercise-form.tsx` and `metric-editor.tsx`, the routes
`app/exercise/new.tsx` and `app/exercise/[id]/edit.tsx`, and the ways in: a `+`
beside the Exercises title, `Edit` on the detail screen, and the empty state's
action. One token added: `minHeight.field`, matching the existing `height.field`
so the notes box can grow from a 56 floor.

**Creating does not collect metrics.** The exercise is created and the screen
hands straight over to its editor, so metric configuration has exactly one
implementation rather than a second that exists only before the row does.

**The fields are a draft; the metrics are not.** Name, family and notes are held
in memory and written on Save. Every reorder, addition and removal commits
immediately, because those are individual acts rather than a form.

Filling that draft from the row inside an effect tripped
`react-hooks/set-state-in-effect`, and the rule was right — the fix is not to
synchronise at all. The draft lives in a child keyed on the row id, so it
initialises from props once. Syncing on every live update would have overwritten
whatever was being typed the moment a metric below it changed.

Empty fields are written as `null`, never `''`: not recorded and recorded-as-
empty are different, and only one of them displays as `—`.

§3.1 names `muted` as the *inactive* chip fill, so a selected type chip cannot
be the muted one. Selection reads as `surface` with a border, carried by weight
as well, since §9 forbids colour alone.

Verified on the emulator, checking the database after each step: create wrote
`is_builtin = 0` with `family` and `notes` null rather than empty; adding two
metrics gave `display_order` 0 and 1; moving one up renumbered to a contiguous
0..1 and moved `Primary` with it; removing the first soft-deleted it and
renumbered the survivor from 1 to 0; Save wrote the edited family.

**Dev-only annoyance.** The `+` in the tab header sits under the dev client's
floating gear, which swallows the tap. There is no such overlay in a release
build. `zoomies://` deep links are no use as a way around it — the dev client
claims that scheme for its own launcher.

### Step 7 — Verification

All four Phase 2 exit criteria pass, run against the restored seed rather than
the state left behind by building.

**Criterion 3 needed history that does not exist yet.** Logging arrives in Phase
4, so proving that editing metrics leaves `set_metric_values` untouched required
a stand-in: a completed session with one set of `12 reps @ +10kg` inserted
straight into the database. Then, through the app, Pull-Up's metrics were
reordered, `Reps` was deleted while values pointed at it, and `Tempo` was added.
The `set_metric_values` rows diff byte-identical afterwards — same ids, same
`exercise_metric_id`s including the one referencing the now-deleted metric, same
values, same `updated_at`.

**DoD 9** — a suggestion activated in one tap, moving into the library and out
of Suggested, 15 → 16 and 26 → 25.

**Criterion 2** — a dismissed suggestion is absent from both library and
suggestions, and identically so after a force-stop and relaunch.

**Criterion 4** — no hex colour, arbitrary Tailwind value, `StyleSheet`, `rgb()`
or inline style prop appears in any of the fifteen files the phase added. The
only `px` is inside a comment quoting DESIGN.md.

Two harness notes, neither an app fault. Removing a row while the list is
scrolled near the bottom clamps the scroll offset and shifts content down, so a
scripted tap can land a row high — it activated `Archer Pull-Up` rather than the
intended `Muscle-Up`. And Android's stylus onboarding sheet can intercept
`adb shell input text`, silently swallowing what was meant for the app.

---

## Phase 2 follow-ups

Branch: `phase-2-followups`. Reviewing the phase found five things, three raised
by reading the code and two while answering them.

The thread connecting the largest two: **Phase 2 built capabilities without
always building a way to reach them.** `archivedExercises()` and `updateMetric()`
were both written, both correct, and both dead code. That is not visible from
the exit criteria, which only test behaviour someone built a path to.

### Suggestions survive archiving

The subquery computing owned families excluded archived exercises, so archiving
the last non-archived member of a family silently removed every suggestion for
it. That is backwards: archiving usually means the movement got too easy, which
is the moment the harder variants matter most. One predicate removed.

Deleting still retracts a family. Archive means "not right now", delete means
"this was a mistake", and only the second is a statement about the family.
`FEATURES.md` §3.3 was ambiguous between `is_active` and not-archived; it now
says which.

### The metric summary reads its units

A library row named its metrics without saying what they measured. The unit is
appended where it adds something and dropped where it repeats the name, so
`Hold (s)` and `Added load (kg)` appear but `Reps (reps)` never does.

`formatMetricSummary`, `formatMetricRole` and `formatMetricDetail` live in
`lib/format.ts`; the last replaced a caption two screens had spelled out
identically. All three take the narrowest shape they need rather than a row, so
`lib/format.test.ts` checks strings without inventing ids and timestamps.

### Archived exercises get a screen

Archiving worked and could not be undone: the library is the only route to the
detail screen and excludes archived rows, so the `Unarchive` button was
unreachable.

They are meant to be out of the way, so this is `app/exercise/archived.tsx`
rather than a section in the main list — burying them under 26 suggestion rows
would have been worse than useless. **The Exercises tab offers a way there only
while something is archived.** With an empty archive there is no icon and no
hint the screen exists, which is the behaviour a rarely-wanted surface should
have: invisible until it isn't.

`BackButton` was extracted here rather than written a fourth time.

### Metrics can be renamed

`updateMetric` existed and nothing called it, so fixing a typo meant deleting
the metric — the one operation that strands logged values on a dead row.

Name and unit are now fields on each metric row, committing on blur, in the same
order as the add-metric form below so the two read as one thing. Type stays a
caption; it is immutable for the reason given in step 3.

**The live-query draft trap recurs here, and it is the third time.** `metrics`
is live, so a field reading straight from props is reset whenever anything else
in the table changes — reordering a metric below would wipe what was being typed
above. Same fix as the `Draft` in `edit.tsx`: a `MetricRow` tied to one row by
its key, initialising from props once and never syncing. Treat any editable
field fed by `useLiveQuery` as needing this.

An emptied name reverts rather than writing a nameless metric.

### Verification

Run against a `pm clear` and a fresh seed. Archiving `L-Sit`, the sole active
member of `l_sit`, left `L-Sit (Tuck)` and `V-Sit` suggested — the pre-fix query
run against the same database drops to 24 suggestions with `l_sit` gone
entirely. The archive icon appeared, opened, unarchived and disappeared again.

For the rename, a stand-in set of `42 s` was inserted against Ring Support
Hold's `Hold` — logging is Phase 4, so history still has to be faked. Renaming
it to `Static hold` through the app kept the row id, `display_order` and
`deleted_at`, moved `updated_at`, and left `set_metric_values` byte-identical
through a subsequent reorder as well. That is the difference the rename buys:
delete-and-re-add could not have done it.

**A note on the previous entry.** Step 7 said the emulator was restored to the
seeded baseline. That was true of `exercises` and not of `exercise_metrics` —
two junk metrics named `2`, typed in by intercepted `adb shell input text`,
survived on the device and were still visible in the library. Checking the
tables a change touches is not the same as checking the ones it doesn't.
