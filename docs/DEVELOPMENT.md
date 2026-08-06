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

### A line on the metric editor

Reviewing the screen before Phase 3 raised three questions: why an exercise has
several metrics, what `Primary` means, and whether a reps target should live on
the exercise rather than the template.

The third is already settled and always was — `exercises` has no target column,
and `template_slots` carries `target_sets`, `target_metric_id` + `target_value`.
One Push-Up row can be targeted at 10 reps in one template and 20 in another,
with §7.4 allowing a further per-session override that leaves the template
alone. The question only arose because Phase 3 does not exist yet, so the metric
editor is the only exercise-shaped screen there is, and metrics read as targets
when you have not seen a slot.

No model change, then — but the screen was silent about two things it cannot
show on its own. `Primary` means nothing until you know it selects the logging
UI (§7.2: a duration primary gives a start/stop button instead of fields), and
the absence of a target field reads as an omission rather than a decision. Two
sentences under the Metrics label now say both.

This is the app's first explanatory copy, so where it goes is worth stating:
**on the screen where the concept is actionable, once.** The detail screen shows
the same `Primary · Duration · s` caption but cannot reorder anything, so it
stays silent; repeating the copy there would cost more than it explained. The
four-metric soft cap (§4.1) was left out for the same reason — a third clause
turns a caption into documentation.

No `DESIGN.md` amendment. The line uses `bodySm` in `text-2`, the same treatment
as the empty-state text already on that screen, so there is no new visual rule.

---

## Phase 3 — Templates

Branch: `phase-3-templates`

### Step 1 — Read layer

`db/queries/templates.ts`: `allTemplates`, `templateById`, `slotsForTemplate`,
`slotById`, `allSlots`, and the pure `indexSlotsByTemplate`.

Rooted per table for the third time, for the same reason: `useLiveQuery` watches
only the root, so a template list joining its slots would never move when a slot
was added. Counts are joined in memory.

`allLiveExercises` and `indexExercisesById` were added to the exercise queries
because a slot written last month may name an exercise archived since, and still
has to render as something better than a UUID. The picker keeps using
`activeExercises` — §3.5 puts archived exercises out of pickers. **Lookup and
offering are different jobs**, and this is the first place that mattered.

`allTemplates` orders by `display_order`, not name. A training week has a shape.

### Step 2 — Write layer

`db/mutations/templates.ts`, and `renumber` extracted to
`db/mutations/ordering.ts` alongside a new `movedOnePlace`.

Two tables now carry a user-arranged `display_order` meaning entirely different
things — which measurement is primary within an exercise, and what order
exercises are trained in — with identical arithmetic. Writing the second copy
was the moment to extract the first. The update is passed as a callback, so each
caller stays typed against its own table instead of fighting Drizzle's generics.
The extraction also removed a defensive `if (moved)` that would have silently
dropped a row from the ordering; `movedOnePlace` throws there instead.

**Deleting a template takes its slots. Deleting an exercise leaves its metrics.**
The asymmetry is deliberate: logged sets point at metrics by id, so those must
outlive their exercise, while nothing points at a slot — `exercise_entries`
copies a target's value and metric, never the slot — so orphans would only make
`allSlots` lie.

`setSlotTarget` writes metric and value together because either alone is
meaningless. Making it one call means they cannot drift apart.

### Step 3 — The template list on Home

`FEATURES.md` defined templates fully and never said how they are reached —
the same omission §3.5 had for archiving. Home is where training starts, so the
list lives there, as a section beneath the screen title rather than as the title,
leaving room for the §11.3 dashboard blocks to arrive around it in Phase 9.

A template has no separate read view. An exercise earns one because Phase 8
hangs history and records off it; a template is a plan, and everything on it is
a thing to change.

The name commits on blur rather than behind a Save button. Everything else on
that screen writes as you act on it, and one field is not a form.

Not built: reordering templates. §5.2 lists reordering slots and not templates,
and inventing it would be assuming an intent the spec does not state.

### Step 4 — Slots

`features/templates/slot-list.tsx` and `app/template/[id]/add.tsx`. The detail
screen moved into a directory route to make room for the picker.

The picker adds on tap and stays, because templates are built several exercises
at a time. The header count is the acknowledgement; a per-row "added" mark would
be a lie, since the same exercise may legitimately appear twice in one template.

A slot whose exercise was deleted renders as `Deleted exercise` rather than
disappearing. Removing it silently would be editing the template on the user's
behalf.

**Metro must be restarted after a route file moves.** `git mv`-ing
`[id].tsx` into `[id]/index.tsx` left Metro's tree stale: the app rendered blank
with no JS error and no red box, which looks exactly like a code fault. Bundles
kept succeeding at "1 module". `npx expo start --clear` and a full 3805-module
rebuild fixed it. Check this before debugging the code.

### Step 5 — Slot targets

`app/slot/[id].tsx`, `lib/parse.ts`, and `formatSlotTarget`.

Its own screen: the slot row already carries three 48×48 controls, and four more
fields would not fit under a thumb. Reached by slot id alone, since v7 ids are
globally unique and the route needs no template to scope it.

**`lib/parse.ts` is where invariant 2 is enforced at the edge.** An empty field
is null because the user said nothing; `0` is a recorded value that happens to be
zero; neither may become the other. `rest_seconds` is exactly this distinction —
null is no timer at all, which is what lets handstand practice run
uninterrupted — and it is the phase's second exit criterion. Unit tested, and
verified on device across all three states.

### Step 6 — Verification

Both exit criteria pass against a reset database.

**DoD 1** — a template `Rings` created from Home, `Chin-Up` and `Dip` added,
`Chin-Up` targeted at 3 × 8 reps. Slots appended at `display_order` 0/1/2;
reordering renumbered contiguously and moved the right row; removing the middle
one soft-deleted it and closed the gap.

**Criterion 2** — `rest_seconds` read back as SQLite type `null`, not integer
`0`. Proven against both other states in the same table at the same time: one
slot null, one slot `0`, the default `60` before either was touched.

**A note on the device.** Two rows appeared during this phase that no command of
mine created — a metric named `10` and a template named `Push day`, the latter
at a minute when only files were being saved. Neither is reachable in code
without a button press. The emulator shares a desktop with a human, which is the
likeliest explanation. Both were removed and the tables reset before the
criteria above were run, but the lesson stands: **check the tables a change does
not touch, not only the ones it does.** That is the second time this has bitten,
after the Phase 2 step 7 baseline.

---

## Phase 4 — Active Session & Logging

Branch: `phase-4-session`. The largest phase, and the one the application
exists for.

### Step 1 — Read layer

`db/queries/sessions.ts`. Rooted per table for the fourth time; `setsForSession`
joins through entries to filter but stays rooted at `sets`, which is the table
that changes when a set is logged, so the `2 / 4` counters move.

**`lastTimeFor` is read once, not subscribed.** History cannot change while a
session runs, so a live query would re-render the logging screen on every set
saved and buy nothing. It prefers the same template and reports `fromElsewhere`
when it falls back, because pull-ups in Pull Day and pull-ups in a Rings session
are different contexts (§7.2).

### Step 2 — Write layer

`db/mutations/sessions.ts` and `sets.ts`.

**The snapshot is the whole point.** `startFromTemplate` copies `target_sets`,
`target_metric_id` and `target_value` onto each entry and nothing reads back
through to the slot afterwards. That is what makes exit criterion 5 true by
construction rather than by care, and what makes the §7.4 override local.

`rest_seconds` is deliberately not copied — it has no column on the entry
because it is not history, only a timer that exists while the session runs.

`discardSession` is the one genuine delete in the app; §6.3 offers no "save and
start a new one", so keeping the rows would leave history containing something
explicitly thrown away. The schema cascades take entries, sets and values, which
is why `db/client.ts` turns foreign keys on — anticipated in Phase 1, first
relied on here.

A blank metric gets **no row at all**. That is what "not recorded" is, and it is
why an unrecorded value can never read back as zero.

### Step 3 — The session screen

Every row carries its `2 / 4` counter, read live rather than computed on entry.
That element is the fix for the problem this application exists for.

Templates open to a detail screen with `Start session` as the primary action
rather than starting on tap — nothing gets started by accident, at the cost of
one tap before training.

`formatTarget` split out of `formatSlotTarget` so a session shows the same words
the plan did. The first attempt called `.replace()` on formatted output to strip
the rest-timer half, which is string surgery on a rendered label and breaks the
moment the wording changes.

### Step 4 — Logging

`app/entry/[id].tsx`, `features/session/set-log.tsx`, and the numeric input of
DESIGN.md §6.2.

**A field per metric, whatever its type.** §7.2 reserves the single tap-to-time
button for a duration-primary exercise and that is Phase 5; §8 keeps manual
entry available regardless. A hold is typed in seconds today rather than being
unloggable for a phase.

**The steppers dropped taps.** Computing the next number from the `value` prop
meant two taps inside one render both read the stale figure and wrote the same
result — nine rapid taps produced 5. They take an updater now. This is the
second time reading state instead of deriving from the freshest value has caused
a bug in this project, after the live-query draft trap.

`To failure` began as a ghost button sized to its own text; a scripted tap
missed it, which was evidence enough. It uses the chip treatment the metric type
selector already had.

### Step 5 — Set operations, notes and the override

A logged set expands in place into the fields that recorded it (§7.3). Editing
upserts, so a metric that had no row gains one — verified by adding a load to a
set logged without one. Deleting renumbers the rest so `set_index` stays 0..n-1.

### Step 6 — Lifecycle

Home carries §6.3's launch prompt. Pausing is explicit; resuming folds the pause
into `accumulated_pause_ms`.

Haptics fire **after** the write, and `setsUntilTarget` is computed before it —
reacting to the count afterwards would fire on every re-render that satisfied
the condition rather than on the set that got there. Every call swallows its own
failure, because a device without a motor must not turn a saved set into an
error.

`expo-keep-awake` and `expo-haptics` contain native code, so the dev client
needed a full `expo run:android` rebuild. **Adding an Expo module with native
code invalidates the installed dev client**; Metro alone is not enough.

### Step 7 — Verification

Five of six exit criteria verified end to end on device.

**DoD 2** — a session starts from a template with all five slots snapshotted,
field for field.

**DoD 3** — a second session from the same template shows `Last time  8` from
the first. It also shows `Target  3 x 9 reps`, the template value, **not** the
`3 x 6` override the previous session carried — which is the override proving
itself session-local.

**DoD 5** — the session survived repeated force-stops and a full APK reinstall
during the native rebuild.

**Criterion 5** — with a completed session holding `3 x 6`, the template slot
was moved to `42 x 99`; the completed entry did not change. It kept the
override, so both the snapshot and the in-session change persist into history
exactly as logged.

**Criterion 6** — a blank field writes no row, and the logged set reads
`9 reps`, never `9 reps . 0 kg`.

**Criterion 4 is verified by mechanism and by persistence, not by the race.**
`logSet` is one `db.transaction` that resolves only after COMMIT, and the UI
does nothing until it resolves; sets survived every force-stop and the reinstall
above. But the specific "kill within milliseconds of the tap" could not be
scripted: `adb shell input tap` returns when the event is *injected*, not when
the app has handled it, so a kill issued straight afterwards lands before React
dispatches `onPress` and tests nothing. Three attempts produced no saved set and
no information. **Worth doing by hand on a physical device.**

**Harness note.** Screenshot byte size is an unreliable readiness signal — a
blank dev-client screen and a rendered one can both exceed any threshold worth
setting. `adb shell uiautomator dump` and matching on app-specific text is
reliable, and tapping the centre of a matched node's bounds survives layout
shifts that break fixed coordinates. Two verification attempts were wasted
before switching.

---

## Phase 4 follow-ups — the smoke test round

Branch: `phase-4-followups`

A full walk of Phases 0–4 on a Pixel 7a, recorded in `docs/SMOKE_TEST.md`. The
data layer and the training loop came through clean — logging, editing,
renumbering, the target override, snapshot isolation, lifecycle and the
force-quit invariant all passed. **Every finding was interface, wording or
input handling**, which is the useful shape for a smoke test to have.

Seventeen items across two rounds. What follows is only what is not obvious
from the diff.

### The keyboard bug was an Android 15 behaviour change

`AndroidManifest.xml` sets `windowSoftInputMode="adjustResize"` and always had.
It stopped working because `app.json` enables edge-to-edge, and from Android 15
the system no longer resizes the window for an edge-to-edge app — so
`adjustResize` is inert and a plain `ScrollView` never learns the keyboard
exists. The add-a-metric form sat entirely underneath it.

Keyboard avoidance went into `components/ui/screen.tsx` rather than onto each
screen, so one added in a later phase inherits it. `className` on
`KeyboardAvoidingView` is registered in `react-native-css-interop`, so the
tokens still apply.

### That fix then caused a data-loss bug

`keyboardShouldPersistTaps="handled"` went on with it. It means a tap on Back is
handled by the button **without dismissing the keyboard first**, so a focused
field never blurs, and six fields that committed on blur silently discarded
their edits: target sets, target value, rest seconds, a template rename, a
metric rename and an exercise entry's notes.

It surfaced as "rest always defaults to 60s" — it never did. 60 is what
`addSlot` inserts, sitting untouched because the edit was never written.

The entry notes field had carried `handled` since Phase 4, so that one had the
bug all along. The smoke test marked notes as FINE, which it would have been if
the tester happened to tap elsewhere before leaving.

**Commit-on-blur was the real defect, not the prop.** A screen left with a field
focused unmounts without ever firing blur. All six now write as you type, which
is what invariant 1 asks for everywhere else. A debounce was considered and
rejected: it reintroduces the same question about a screen going away mid-wait.

### The metric editor was rebuilt, not patched a fourth time

Three rounds of fixes to this screen each addressed a symptom — labelling the
fields, renaming `Primary` to `Logged first`, replacing free-text units with a
picker — and the user was still confused. The cause was the model the screen
exposed: **name, type and unit as three orthogonal fields to compose.**

`number` covers both a count and a load, so a unit list scoped by `type` could
only ever offer `kg` to both. Hence reps measured in kilograms, and the question
that ended it: "KG what?"

`lib/metrics.ts` now holds four whole metrics — Reps, Added load, Hold, Notes —
and choosing one settles all three columns at once. The bad combination is
unreachable rather than discouraged. This is the vocabulary `db/seed.ts` always
used, and `FEATURES.md` §15 had already cut a custom metric registry as "an
entire CRUD surface for one user"; one had been built anyway, in pieces.

Identity is the `(type, unit)` pair, never the name.

**What a metric measures is now changeable until the first set is logged against
it.** Before that there is nothing to reinterpret. After it, a conversion would
turn every logged 30-second hold into 30kg, so it locks and the row says why.
The guard is inside `convertMetric`'s transaction, not only in the editor —
soft-deleted values count, because they stay on disk and go into the §12 export.

### A picker built from the data can only be as clean as the data

The first unit picker offered `SELECT DISTINCT unit`, which meant every typo
ever made became a permanent suggestion and the next one joined it: `rep`,
`reps`, `s` and `secund` in one list. Deriving a vocabulary from the rows it is
meant to constrain does not work. The canonical list in code was the fix, and
migration 0002 cleaned up what free text had left behind.

### Two data migrations, both label-only

- **0001** rewrote `family` from slugs (`pull_up`) to readable text (`Pull-up`).
  It was shown to the user verbatim, underscores and all.
- **0002** normalised unit spellings and dropped units that only restate their
  metric's name — which is what made `Reps` sit above `reps`.

Both were written by hand via `drizzle-kit generate --custom`: this is data, not
schema, and nothing about the tables changed. Both were verified offline against
a scratch database built from migration 0000 before going near the device, which
is worth doing for any migration that rewrites rows — a user-typed family and a
deliberate `m` unit both had to survive, and testing that is cheaper than
discovering it.

### Harness notes

- **`expo-sqlite` stores its database at `files/SQLite/zoomies.db`**, not
  Android's `databases/`. Two pull attempts failed on the wrong path first.
- **A migration added mid-session does not apply until a cold start.**
  `useMigrations` runs when `RootLayout` mounts, and Fast Refresh replaces
  modules without remounting the root. Force-stop before checking migration
  results, or you are reading the previous schema.
- **A release APK never contacts Metro** — its JS is bundled in. Time was lost
  testing a release build against changes that only existed in the dev server.
  `run-as` also refuses it, since it is not `debuggable`.
- Hermes bytecode does not grep for plain strings, so a release APK's bundle
  cannot be checked that way. The Metro bundle can, and is a good proxy for
  "did this compile and reach the device".
