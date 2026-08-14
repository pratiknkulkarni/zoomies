# Features & Data Model

**Project:** Zoomies
**Document Type:** Product Source of Truth
**Status:** Authoritative — supersedes all prior feature decisions
**Last Updated:** August 2026
**Companion Documents:** `TECH_STACK.md`, `DESIGN.md`

---

## 0. Status of This Document

This document is the **single source of truth for features and data model**.

It supersedes the feature content of:

- `requirements_one.md` (TENSION PRD)
- `fitness_app_readme.md`
- `reuirements_two.md` (Design Notes)

Where those documents conflict with this one, **this document wins**.

The *philosophy* in `reuirements_two.md` §4 (Design Philosophy), §7 (Prepare →
Train → Reflect) and §28–30 (UX guidelines) remains valid and is not restated.

### 0.1 The Actual Problem

This application exists because sets get forgotten or missed during training
when tired. Every feature is justified against that, or against the reflection
that follows training. The user is the developer. There are no accounts, no
other users, and no customers in v1.

### 0.2 Superseded Decisions

| Source | Prior decision | Current decision |
|---|---|---|
| `requirements_one.md` §4.1–4.5 | Skill DAG, TUT state machine, rope matrix, heatmap, tendon load index | All five cut |
| `reuirements_two.md` §8.6 | Rating metric type | Removed entirely |
| `reuirements_two.md` §8.6 | Selection metric type | Removed — progressions are exercise names |
| `reuirements_two.md` §10.9 | Exercise variants as a sub-object | Variants are separate exercises |
| `reuirements_two.md` §11.3–11.5 | Default vs optional metrics; custom metric registry | Removed; metrics defined inline on the exercise |
| `reuirements_two.md` §9.7 S-002 | Every session must originate from a template | Every session **may** originate from a template |
| `reuirements_two.md` §8.9, §19 | Monthly / yearly Recaps | Deferred |
| `reuirements_two.md` §15.5–15.7 | Calendar, search, filters | Deferred |
| `fitness_app_readme.md` | Accounts, freemium tiers, monetization, export as paid | Cut; export is free and in v1 |

---

## 1. Core Objects

Seven objects. Nothing else is a top-level concept.

| Object | Lifetime | Purpose |
|---|---|---|
| **Exercise** | Permanent | The long-term memory of one movement |
| **Exercise Metric** | Permanent, owned by Exercise | Declares what that movement measures |
| **Template** | Permanent | A reusable training plan |
| **Template Slot** | Permanent, owned by Template | One exercise in a plan, with its target |
| **Session** | Permanent once completed | One training event |
| **Exercise Entry** | Lives inside a Session | One exercise performed in one session |
| **Set** | Lives inside an Exercise Entry | One recorded effort |

Plus one value store: **Set Metric Value**.

Derived, never stored: totals, personal records, trends, consistency.

---

## 2. Data Model

Applies the schema rules in `TECH_STACK.md` §4.3 — UUID v7 keys,
`created_at` / `updated_at` epoch millis, nullable `deleted_at`.

```
meta
  key, value                       -- seed flag, schema notes

exercises
  id, name, family, notes,
  is_builtin, is_active, is_archived,
  suggestion_dismissed_at             -- §3.3, dismissals do not return

exercise_metrics
  id, exercise_id, name, type, unit, display_order
  type ∈ { number, duration, notes }

templates
  id, name, display_order

template_slots
  id, template_id, exercise_id, display_order,
  target_sets, target_metric_id, target_value

sessions
  id, template_id (nullable), name,
  started_at, completed_at (nullable),
  paused_at (nullable), accumulated_pause_ms,
  is_quick_log, notes

exercise_entries
  id, session_id, exercise_id, display_order,
  target_sets, target_metric_id, target_value,
                                      -- snapshotted from slot at start
  template_slot_id (nullable),        -- §6.6, provenance only
  notes, is_ad_hoc

sets
  id, exercise_entry_id, set_index, to_failure, performed_at

set_metric_values
  id, set_id, exercise_metric_id, value_num, value_text
```

### 2.1 Storage Rules

- **A set stores no measurements.** Values live one table down, one row per
  metric. `12 reps, felt strong` is one `sets` row and two `set_metric_values` rows.
- **Nothing aggregated is stored.** `24 reps` does not exist in the database —
  it is a `SUM` at read time. The `12 · 12` breakdown is the rows themselves.
- **Null means not recorded. Zero means zero.** An unrecorded value is never
  written as `0`. Displayed as `—`.
- **Changing an exercise's metrics never touches historical rows.** Metrics are
  soft-deleted, never removed.
- **Targets are snapshotted onto the exercise entry** at session start,
  including `target_metric_id` — which metric the target refers to is part of
  the target. Resolving it through the template slot at read time would let a
  later template edit change what a completed session says. Editing a template
  never rewrites history.
- **`template_slot_id` on an entry is provenance, never a target source.** No
  target is read through it — that would undo the rule above. It answers one
  question, for the raise prompt of §6.6: which slot should a beaten target be
  written back to. The exercise cannot answer it, because §5.2 lets one exercise
  fill two slots with different targets. Null for ad-hoc entries, ad-hoc
  sessions and quick logs, none of which has a plan to raise, and null again
  once the slot is gone.
- **Durations are seconds. A count carries no unit at all** — `Reps` is
  already the word (§4.1.1).

---

## 3. Exercise

Permanent. Independent of any session. Accumulates history indefinitely.

Owns: name, family, optional notes, its ordered metrics, active and archived
flags.
Does **not** own: sets, sessions, or dates.

### 3.1 No Progressions

Progression is **not** a tracked dimension. A progression level is part of the
exercise name.

`Front Lever (Tuck)` and `Front Lever (Straddle)` are two separate exercises
with independent history and independent personal records.

Rationale: a tuck PR and a full PR are not the same achievement, and modelling
progression as a metric adds a dimension to every query for no gain. Easy to
reintroduce later — values are rows, not columns.

### 3.2 Active Library vs Catalogue

All built-in exercises are seeded into the `exercises` table. Only a subset is
**active**.

- `is_active = true` — appears in pickers, in the Exercises tab, and in search
- `is_active = false` — exists in the catalogue, suggested but not shown as owned

Roughly fifteen are active on first launch. The rest sit dormant and cost
nothing.

**`family` is human-readable text, not a slug.** It is shown to the user on the
exercise detail screen and groups the Suggested section; nothing joins on it and
no code branches on its value. It was seeded as `pull_up` and displayed
verbatim, underscores and all. Sentence case, per `DESIGN.md` §2.5.

**Active on first launch:**

| Exercise | Family | Metrics |
|---|---|---|
| Pull-Up | Pull-up | reps, load |
| Chin-Up | Pull-up | reps, load |
| Ring Row | Row | reps |
| Ring Dip | Dip | reps, load |
| Dip | Dip | reps, load |
| Push-Up | Push-up | reps |
| Ring Support Hold | Support hold | duration |
| L-Sit | L-sit | duration |
| Front Lever (Tuck) | Front lever | duration |
| Back Lever (Tuck) | Back lever | duration |
| Handstand | Handstand | duration |
| Handstand Push-Up | Handstand push-up | reps |
| Pike Push-Up | Handstand push-up | reps |
| Pistol Squat | Squat | reps, load |
| Hanging Leg Raise | Core hang | reps |

### 3.3 Exercise Suggestions

**The `family` column drives suggestions.** Not string similarity — a curated
grouping, seeded with the catalogue.

The Exercises tab shows a **Suggested** section beneath the active library:
inactive catalogue exercises whose `family` matches an exercise the user already
has active. Rendered in a lighter tone, clearly not-yet-owned. One tap activates.

Example: with `Front Lever (Tuck)` active, the app suggests
`Front Lever (Advanced Tuck)`, `Front Lever (One Leg)`,
`Front Lever (Straddle)`, `Front Lever (Full)`.

Rules:

- Suggestions are never automatic. Nothing is added without a tap.
- Suggestions are dismissible per exercise and do not return.
- **Archived exercises still count toward the families the user owns.**
  Archiving is usually a graduation — the movement got too easy — so retracting
  its family would hide the harder variants at exactly the moment they became
  relevant. Deleting does retract a family.
- No suggestion is ever shown during an active session.
- Suggestions carry no implication of readiness. They are a menu, not a
  progression system, and nothing is gated behind anything.

The full catalogue can be expanded at any time without a schema change — it is
seed data. Compiling the complete list is deferred.

### 3.4 Custom Exercises

Created by the user with the same fields. `is_builtin = false`, `family` null or
user-chosen. No distinction after creation.

### 3.5 Archiving and Deletion

Archived exercises disappear from pickers but retain full history. Deletion soft-
deletes; history remains queryable. A deleted built-in does not reappear on the
next launch — the seed runs once (see `TECH_STACK.md` §4.5).

Archiving is reversible, so it needs somewhere to be reversed from: an
**Archived** screen, reached from the Exercises tab. Its entry point exists only
while something is archived — with an empty archive there is no control and no
hint the screen is there. Rows open the ordinary exercise detail, which carries
`Unarchive`.

---

## 4. Metrics

Three types. No rating type. No selection type. No user-created metric registry —
metrics are defined inline on the exercise and duplicated across exercises where
needed.

| Type | Stores | Examples |
|---|---|---|
| **Number** | `value_num` | reps |
| **Duration** | `value_num` (seconds) | hold time |
| **Notes** | `value_text` | free text |

### 4.1 Rules

- Metrics are ordered. The first metric is the **primary metric** and drives the
  logging UI (see §7.2). The interface calls it **`Logged first`**, not
  `Primary` — a rank named without its consequence explained nothing, and
  `Primary · Number` read as two pieces of jargon side by side.
- Soft cap of four metrics per exercise. A guideline, not enforced.
- Nothing is required **per metric**. Save a set with whatever was recorded —
  reps without the load is a complete set, and the load is simply unrecorded.
- **A set must record something**, though: at least one value or `to_failure`.
  Save is disabled until then. `to_failure` on its own counts — "I went to
  failure and did not count" is an observation. An untouched form submitted by a
  stray tap is not, and it used to produce a set reading `Recorded` with nothing
  behind it.
- Unrecorded values are null, never zero.

### 4.1.1 A Metric Is Chosen Whole

**There are four metrics, and `name`, `type` and `unit` arrive together.**

| Choice | `name` | `type` | `unit` | Measures |
|---|---|---|---|---|
| Reps | `Reps` | `number` | — | a count |
| Hold | `Hold` | `duration` | `s` | seconds |
| Notes | `Notes` | `notes` | — | text |

Defined in `lib/metrics.ts`. Three choices sit comfortably under the soft cap
of four.

**Nothing composes them by hand.** The three columns were once three fields on
screen, which required knowing that a count is a `number` with no unit while an
added load was a `number` with `kg`. It produced *reps measured in kilograms* —
because `number` covered two unrelated things, so a unit list scoped by type
could only ever offer `kg` to both. Three successive fixes to that list each
addressed a symptom. Choosing the whole metric makes the bad combination
unreachable rather than discouraged, and agrees with §15, which cut a custom
metric registry as "an entire CRUD surface for one user".

**A metric no preset covers is described, not rejected.** Added load metrics
still exist in databases that predate §15's removal, and read as
`a number in kg`. Nothing breaks on them and nothing logged against them is
lost.

**A count has no unit.** `Reps` is the name, so a `reps` unit beneath it repeats
the word. Display falls back to the metric's name, so a set still reads `9 reps`
with nothing stored.

**The name stays editable; what it measures does not, once used.**
`set_metric_values` holds a bare number, and the metric's `type` and `unit` are
the only record of what that number meant — converting afterwards would turn
every logged 30-second hold into 30kg. So a metric can be switched freely until
the first set is logged against it, and is fixed after that, with the row saying
why. Removing it keeps the values already recorded.

The guard lives in `convertMetric`, not only in the editor: a mutation that can
rewrite the meaning of history must not depend on a screen having been drawn
correctly. Soft-deleted values count — they remain on disk and go into the §12
export.

### 4.2 Set-Level Flag

`to_failure` is a boolean on the set itself, not a metric. Present on every set
regardless of exercise. Eight clean reps and eight grinding reps are different
data.

---

## 5. Templates

A reusable plan. Ordered list of slots.

**Templates live on Home.** That is where training starts — a session
originates from one (§6.1) — so the first screen carries the thing the user
came to do. They are a section beneath the screen title, not the title itself,
so the §11.3 dashboard blocks arrive around the list rather than displacing it.

Slots carry the targets, never the exercise. The same Push-Up can be targeted at
10 reps in one template and 20 in another, and §7.4 allows a further override
for a single session. Nothing about a target belongs on `exercises`.

### 5.1 Template Slot

| Field | Purpose |
|---|---|
| `exercise_id` | Which movement |
| `display_order` | Position in the session |
| `target_sets` | Nullable. Null = no target; counter shows completed only |
| `target_metric_id` + `target_value` | Nullable. e.g. 8 reps, or 30 seconds |

A slot carries **no rest setting** — the rest timer is cut (§15).

### 5.2 Operations

Create, rename, add/remove slots, reorder slots, edit targets, delete. Templates
change infrequently and are edited outside of training.

**The same exercise may appear in a template more than once** — pull-ups to open
and again as a finisher are two slots with their own targets, not one slot with
a larger `target_sets`. So the picker counts what has been added and offers to
remove one, rather than toggling an exercise in and out. The count and its
control sit on the row itself: a stray double-tap has to be visible where it
happened, not discovered later on the template screen.

Slots are reordered; **templates themselves are not**. New ones append. If a
training week ever needs an order of its own, that is an addition to this list,
not an assumption to be read into it.

Deleting a template deletes its slots. Nothing points at a slot —
`exercise_entries` copies a target's value and metric, never the slot — so
unlike an exercise's metrics, they have no reason to outlive their parent.

---

## 6. Sessions

### 6.1 Origins

A session **may** originate from a template. Three kinds:

| Kind | `template_id` | `is_quick_log` | Behaviour |
|---|---|---|---|
| **Template session** | set | false | Slots become exercise entries |
| **Ad-hoc session** | null | false | Starts empty, exercises added as you go |
| **Quick log** | null | true | One exercise, logged and auto-completed |

All three produce identical rows. One code path for history and analytics, not
three.

**Quick log** is for training outside a session — five pull-ups in the evening.
One tap: pick exercise, enter values, done. No session screen is shown.

### 6.2 States

**Active** — one at a time. Logging enabled. Speed is the only priority.

**Paused** — an explicit user action meaning training stopped. Never automatic.
Accumulates into `accumulated_pause_ms` so session duration stays honest.

**Completed** — immutable history. Appears in History.

**Leaving the application is not pausing.** Session state lives in SQLite;
switching apps changes nothing.

### 6.3 Resume

On launch with an unfinished session:

> **Resume** · **Complete it now** · **Discard**

Discard requires a second confirmation. There is no "save and start a new one" —
an in-progress session is either finished or thrown away.

### 6.4 Ad-Hoc Exercises Mid-Session

An exercise not in the template can be added to an active session — pushups on
leg day. It joins this session only (`is_ad_hoc = true`), carries no target, and
the template is untouched.

### 6.5 Completion

- An exercise auto-checks as complete when `target_sets` is reached.
- **Exceeding a target is fine.** Extra sets log normally; the exercise stays
  complete.
- On finishing, warn about exercises with **zero sets logged**. Bypassable in one
  tap. Do not warn about exercises merely short of target — deliberately cutting
  a set is normal and should not nag.
- Exercises with zero sets show `not trained` as their "last time," never zeros.

### 6.6 Target Raise Prompt

At session completion only — never during training:

> Pull-Up — you hit 10 reps against a target of 8.
> **Raise target to 10?**  [Yes] [Keep 8]

Offered only when the target was beaten on the **majority of sets**, not one
lucky first set. One tap. Ignoring it changes nothing. This is the only mechanism
by which targets increase; there is no automatic progression.

A majority is strictly more than half, so two of four does not qualify. A tie is
not a beat — hitting the target is what the target is for. A set where the
target's metric went unrecorded counts toward the total but never toward the
beats: it happened, it just was not measured.

**It writes to the template slot**, found through the entry's `template_slot_id`
(§2). The completed session is never rewritten — invariant 5 — so the raise
changes the next session and no past one.

**A raise may never be a lowering.** The prompt compares against what was
trained against, override included (§7.4), but the write only happens when the
best set also beats what the **slot** currently says. Dropping a target to 8 for
a bad night and hitting 10 has genuinely beaten it, and writing 10 over a
template that still says 12 would quietly cut the program.

Nothing is offered where there is nothing to raise: an ad-hoc exercise, an
ad-hoc session, a quick log, or a slot removed from the template since the
session started.

---

## 7. Logging

The screen that matters. Everything else is secondary.

### 7.1 Session Screen

Ordered exercise list, each row showing name and a `2 / 4` completion counter.
The counter is visible **without opening the exercise** — a glance shows what is
outstanding. This is the specific element that solves the original problem.

### 7.2 Exercise Screen

```
Pull-Up                                    2 / 4

  Target      4 × 8 reps
  Last time   8 · 8 · 7 · 6
```

Target in normal weight, last time greyed.

**"Last time" is scoped to this template.** Pull-ups in Pull Day and pull-ups in
a Rings session are different contexts. If this template has no prior history,
fall back to the most recent occurrence anywhere and label the source. Exercise
Details shows everything across all templates.

**Logging UI is driven by the primary metric:**

- **Number primary** → numeric fields and a Save button.
- **Duration primary** → one large button. Tap to start, tap to stop, records the
  set. Tap again for the next one. Fifteen holds logged in three minutes with no
  typing.

### 7.3 Set Operations

Edit any set inline. Delete any set. Both available during and after a session.
Mislogging while tired is expected.

### 7.4 In-Session Target Override

Tap the target to change it for **this session only**. The template is not
modified. A bad night should never silently rewrite the program.

### 7.5 Notes

One note per **exercise entry**, not per set. Written after finishing the
exercise. Session-level note optional at completion.

### 7.6 Haptics

On set saved, timer complete, target reached, and **an exercise added to a
template**. Feedback without looking at the screen.

The fourth is not a training signal like the others. It is there because the
result of the tap — the `× 2` tally on the row — cannot appear until the write
has landed and the query has re-run, and building a template is the other place
in the application where taps come in quick succession. A haptic is the only
acknowledgement that can happen in the same frame as the tap, so it is fired in
the press handler, before the write.

Nowhere else. A haptic on every press is a buzzing phone, not feedback.

---

## 8. The Hold Timer

One timer, for duration exercises. There is no rest timer (§15).

It appears when the **primary metric is a duration** — the same rule §7.2 uses
to decide the logging UI, so nothing extra configures it. Manual entry stays
available: a hold can always be typed instead.

**With a duration target**, it counts **down** from the target. At zero it
sounds, buzzes, records the set at the target value and resets for the next one.
Tapping Stop earlier records what was actually held and resets the same way. So
three 30-second holds are three taps.

**With no target**, it counts **up** from zero and Stop records what it reads.

Start, pause and stop throughout.

**A hold longer than its target cannot be logged from the timer** — recording at
zero is what makes the set hands-free, and the two cannot both be true. Beating
a target means editing the set afterwards, which §7.3 already allows inline.
This is a deliberate trade, not an oversight.

### 8.1 Correctness Rules

- Timing derives from a **start timestamp**, never accumulated `setInterval`
  ticks. Returning after 90 seconds in another app shows the correct elapsed
  time. An interval may drive repainting; it may never accumulate.
- Leaving the exercise mid-hold discards the running timer and records nothing.
  You have stopped holding, and nothing that was ever a set is lost.
- `expo-keep-awake` is active for the duration of a session.

---

## 9. History

**Timeline** — reverse-chronological list of completed sessions. Date, name,
duration, what was in it. **Flat, with the breaks drawn.** Training clusters —
two sessions and a quick log on one day, then nothing for three — and the gap is
part of the record. This was grouped under a heading per day, which stated the
days that exist and said nothing about the ones that do not; a rule reading
`8–11 Aug · no training` costs one hairline and says the thing a missing heading
could not.

**A heading per month, and it is not the grouping above that was rejected.**
`AUG 2026`, `JUL 2026`, in §2.4's label treatment on the gutter. The objection
to a heading per day was that it states the days that exist and says nothing
about the ones that do not; a month heading makes no claim about any day. It is
a ruler down the side of a list that is long enough to get lost in, which at two
hundred sessions it is — and the year is always carried, because `Aug` alone
halfway down a scroll is only unambiguous to someone who already knows how far
they have come. The gap rules are unaffected and still do the work of saying
what did not happen.

**Every row is ruled and no row wraps.** A session is two lines and a quick log
is one, so a screen of them separated by whitespace alone reads as a column of
loose text rather than as a list of things — the eye cannot find where one entry
ends. One `rule-2` hairline per row settles it, dropped where a gap rule already
separates. The exercise line is held to one line with the set count pinned at
its end: a six-exercise session wrapped to three lines and made one row taller
than the two beside it together, and truncation must eat the detail rather than
the total.

**Quick logs appear, marked.** §6.1 makes all three kinds the same rows so there
is one code path for history; hiding one kind would mean training that is
recorded and invisible. A quick log has no name of its own, so it borrows its
exercise's, carries a `ONE-OFF` tag, and gives no duration — its start and end
are the same instant, so a length would read as a very short session rather than
something that was never one. §11.5 keeps quick logs out of the sessions
*figure* on the dashboard, which is where the distinction earns its keep.

**Session detail** — everything logged, per set, with notes. **Unrecorded
values read as `—` here**, unlike on the session screen, which omits them. Mid-
set the priority is scanning; in history it is fidelity, and a metric silently
dropped makes `10 reps` indistinguishable from `10 reps` beside a note that was
never written. Invariant 2 is the rule in both places.

**Edit** covers the session's name and note, as a draft (§18), and any set
through the exercise screen, where §7.3's inline edit already works "during and
after a session". A quick log is not offered a name: it never had one, and
giving it one would make it look like a session that was planned.

**Delete** removes a session from the record. Its entries and sets go with it;
the exercises remain, along with everything logged in other sessions. The row is
soft-deleted (invariant 7) — every read filters on it, so the training leaves
every surface at once while remaining exportable. This is a different act from
**discarding** an unfinished session (§6.3), which genuinely removes rows and is
refused once a session has completed.

Calendar, search and filters are deferred. A scrolling list is sufficient at this
volume.

---

## 10. Exercise Details

The lifetime view of one movement, reached from the Exercises tab. Not a session
screen. This is the payoff for making Exercise permanent.

**v1:**
- Every set ever logged, newest first, with its session and date
- Personal records per metric — most reps, longest hold
- Best-set trend over time — one dot per session, see §10.2
- Which sessions it appeared in
- Its metric configuration

Unlike the session screen, this view spans **all** templates and includes quick
logs.

### 10.1 What Holds a Record

Four rules, each of which is a way of getting a record wrong. All four are unit
tested in `lib/records.test.ts`, and none of them lives inside a query.

- **Only rankable metrics.** `number` and `duration` rank; `notes` does not.
  Text has no ordering, so the longest note is not an achievement.
- **Null is never a candidate** (invariant 2). A set where Reps went unrecorded
  did not score zero reps. Zero *is* a candidate, because someone entered it.
- **A tie keeps the earlier holder.** Matching your best is not beating it — the
  same rule §6.6 already applies to the raise prompt. A record that moved to the
  newest set every time it was equalled would report a date that means nothing.
- **Only completed sessions rank.** A record claimed mid-session would vanish if
  that session were then discarded, and §9 already draws this line for history.
  The moment a target is beaten during training belongs to the completion review.

Records rank against the exercise's **current** metrics. A metric that is later
removed keeps every value it recorded — that is what `set_metric_values` is for
— but stops holding a record, because the exercise no longer claims to measure
that thing.

Nothing is stored. A record is a fold over sets every time it is read
(invariant 3). There is no `personal_best` column and there must not be one: it
would be a second source of truth that a corrected set could not reach.

### 10.2 The Trend, and How It Is Drawn

**Dots, never a line.** One dot per session, at the best set of that session.
A line joining two sessions three weeks apart draws training that did not
happen, and the whole argument for the shape is that it refuses to.

**Positioned by date, not by index.** This follows from the rule above and is
the easy way to lose it: dots spaced one per session would make a three-week
gap look exactly like three consecutive days, which is the lie the dots were
chosen to avoid. Horizontal position is time.

**Two y labels only** — the all-time minimum and maximum, at `text-5`, **fixed
to the whole history**. An axis that rescaled as the chart scrolled would mean
the same dot height was 6 reps in one window and 11 in the next, so two
identical-looking stretches of chart would say different things. Fixed, the
chart reads as progress across the whole span, which is what §10 means by *the
lifetime view of one movement*. No gridlines and no axis rules.

**The metric is named in the section label** — `BEST SET EACH SESSION · REPS` —
rather than in a control. A picker appears only when an exercise has more than
one rankable metric; most have one, and a picker over a list of one is
furniture. §10.1's rules apply unchanged, so a `notes` metric is not offered.

**Drawn by hand, with no charting stack.** Absolutely-positioned `View`s in a
fixed-height container, `left` and `bottom` as percentages computed from the
data. `DESIGN.md` §7 forbids axes, gridlines, tooltips, gestures and animation,
which is every feature a chart library sells — so `victory-native` and its Skia
requirement would install three packages to position forty views. This is the
same move §11.3 made when the grid replaced the bar chart. `react-native-svg` is
present as a peer of the icons and is deliberately not imported from a screen,
which would make it a direct dependency in everything but the manifest. It stays
the fallback if forty positioned views read badly on device, and that decision
would be one component wide.

Those percentages are the one place inline style is correct: a ratio derived
from data is not a design value, and no token can express it. `DayGrid` already
takes the same exemption for `flex: month.columns`.

§11.7 makes the argument from the data's side, and it still holds: a trend says
little before roughly twelve weeks of it exist. The set list, newest first,
already shows where a movement is going for anyone reading down it — which is
why this was the last thing built rather than the first.

---

## 11. Dashboard & Analytics

### 11.1 The Constraint

**Reps and seconds do not aggregate.** There is no meaningful combined volume
figure across a pull-up and a ring support hold. Any such number would be
invented.

Therefore all analytics is either **per-exercise** or **count-based** (sessions,
sets, days). This rules out most vanity metrics automatically.

### 11.2 Questions the Dashboard Answers

1. Am I showing up?
2. What am I neglecting?
3. Am I getting stronger?
4. What did I just achieve?

### 11.3 Dashboard Blocks

**The grid draws a quarter, and every week ever is one tap away.** One square
per day over nineteen years is 7,000 views and blocks the main thread for over
two seconds, so the tab is bounded to the thirteen columns it can draw in a
frame and a pushed **Days trained** screen holds the whole span. Bounding
without that screen would have been a feature removed rather than a cost moved.
That screen carries the application's only loader, and the exception is the
argument: everything else resolves fast enough that a spinner would flash and
read as a fault, where this one genuinely takes a moment and should say so.

Four blocks, in order. Nothing else. The screen is titled **Look back** and is
**a tab, never Home** — what you want at 18:39 in a garage is a Start button,
not a review of the last quarter, and that reasoning is untouched by giving it
a tab. It was reached from a `Look back ›` link on History's title row; that
stopped being defensible when Settings left the identical treatment on Home,
leaving one text link in one corner of one screen — a navigation vocabulary of
a single word, which is the objection this project already raises against an
icon used once.

**Days trained** — one square per day, filled where anything was logged. Seven
rows, Monday first, by thirteen week columns.

*This is deliberately not a streak.* No number, no current run, no reset, no
flame, no penalty for a rest day. It shows the quarter; it does not score it.
Binary, never shaded by volume — §11.1 rules out a combined figure across a
pull-up and a hold, so an intensity ramp would have to invent the number it
shaded by.

**It is always a quarter wide, and it draws from the first session.** Those are
two rules, and separating them is what makes it work. A fixed quarter of blank
past shown to someone in week two is a report of failing to train before they
owned the app — so nothing before the first logged day is drawn. But a grid that
*narrowed* to the weeks it had would size its squares by how new the user is,
which is how it first shipped: week two got two columns to fill a phone with,
and the squares came out the width of a thumb. So the width is fixed at thirteen
columns and the leading ones are simply held open and left blank.

**Blank means outside the record, at either end.** The two marks say *trained*
and *skipped*, and neither is true of a day before the app was keeping count or
of a day that has not arrived. So the first column is ragged at the top and the
last is ragged at the bottom, and today's column sits at the right edge for
good.

**Sessions and quick logs** — two counts over the last 28 days. Small type, not
a hero element. §11.5 keeps quick logs out of the sessions figure; stating them
beside it rather than dropping them is the difference between a rule and a
silence, because a week of doorway sets is not a week of sessions but is
certainly not a week of nothing. Where history is younger than the window the
caption says `since 16 Aug` instead of `last 28 days` — a window wider than the
history states days of nothing that never happened.

**Longest since trained** — three to five active exercises, longest gap first,
`Nordic Curl · 6 May · 101 days`. Directly answers the design notes' question
"what exercises have I neglected." Cheap to compute and useful from week two.

Sorted by the gap **with the date beside it**, so a movement deliberately
stopped reads as a fact rather than a debt. Never-trained is not a long gap: it
has no last date, and something added yesterday is not neglect (invariant 2).
Nothing under a week appears at all — a list that ranked the whole library by
recency would be the same object with the meaning removed.

**Recent records** — personal records set in the last 30 days.
`Ring Support Hold — 42s, up from 38s`. Factual, no celebration.

A record here is an **event**, not a standing: the exercise screen (§10) answers
"what is my best", and this answers "what did I just beat". So a first-ever set
is not a record — it is a baseline, and month one would otherwise be a wall of
them, since every exercise's first set is its best set. One row per exercise and
metric, the most recent.

**What replaced what.** This specified five blocks: *This week*, *Last 7 days*,
*Sessions per week* (a 12-week bar chart), *Not trained recently* and *Recent
records*. The grid answers both *Last 7 days* and *Sessions per week* in one
object made of `View`s, which also removed the only reason Phase 9 needed a
charting stack (§10.2, `PLAN.md` §4.4). *This week* became 28 days because a
week holds nought to four sessions and swings between halves and doubles on a
Sunday, and its *sets* figure became quick logs because the grid above already
draws this week and §11.5's exclusion was the thing worth making visible.

### 11.4 Per-Exercise Analytics

Lives in **Exercise Details** (§10), not the dashboard. Best set over time for
one movement. The dashboard answers "how am I doing"; Exercise Details answers
"how is *this* doing."

### 11.5 Counting Rules

- **Quick logs do not count as sessions.** They count toward sets, personal
  records, per-exercise history, and days-since-trained — but not the sessions
  figure. Five evening pull-ups is not a training session, and letting it count
  would make the number meaningless.
- Ad-hoc sessions **do** count as sessions.
- Personal records are computed per exercise per metric. A duration PR and a rep
  PR are separate.
- All figures are computed at read time. Nothing is cached or stored.

### 11.6 Explicitly Excluded

Streak counters, time-in-app, muscle-group heatmaps (requires tagging that does
not exist), composite scores of any kind, calories, comparison to other people,
predicted maxes, readiness scores.

### 11.7 Shipping Order

All four blocks shipped together in Phase 9, which the grid made possible: it
needs no chart, and it is honest in week one because it draws only the weeks
that have happened. **Longest since trained** and **Recent records** were the
two that had to work from week two, and both do — the first from the second
week, the second from the first time anything is beaten.

There is no chart left to hold. §11.4's trend is the only one in the
application, and it shipped last, in Phase 11 — by which point it needed no
dependency either (§10.2).

---

## 12. Data Export

Local JSON export of the entire database, via `expo-file-system` and
`expo-sharing`. Free, in v1, no server involved.

With no cloud in v1, **this is the only backup**. Non-negotiable.

Import is deferred, but the export format should be designed so import is
possible later.

### 12.1 What the File Says

```json
{
  "format": "zoomies-export",
  "version": 1,
  "exportedAt": 1755100000000,
  "schemaVersion": 5,
  "tables": { "exercises": [ … ], "sets": [ … ] }
}
```

Four rules, all of them following from *this is the only backup*:

- **Every table, discovered from the schema.** A table added to `db/schema.ts`
  joins the export by existing. A list kept by hand works until someone adds a
  table, and then every backup taken before anyone notices is quietly
  incomplete. This is the property most worth testing and it is tested against
  the real schema.
- **Every column, via `SELECT *`.** Same failure one level down. It also means
  the SQL column names are what lands in the file, which is what an importer
  writes back and what a rename in the schema file cannot move out from under a
  file already on disk.
- **Soft-deleted rows included.** Every other read filters `deleted_at`, which
  is what makes a deleted set disappear from the application. Doing it here
  would make it disappear from the backup — a much larger claim, and one the
  user would have no way of discovering.
- **Nothing aggregated and nothing renamed.** Invariant 3 says totals are not
  stored; a total written into a file is stored. The file is a copy of the
  database, not a view of the application.

`version` is the file's shape and `schemaVersion` is the rows'. They move
independently: a later release can change how the envelope looks without
touching the schema, and vice versa. Versioning from the first release is the
whole of what "designed so import is possible later" costs, because the second
release cannot add a version to files already written.

**Written to the cache directory and handed to the share sheet.** Once the user
has put it somewhere, that copy is the one that matters; keeping a growing pile
of exports inside the application would be a second, invisible store of training
history.

### 12.2 Where It Lives

**Settings is a tab.** It was a `Settings ›` link on Home's title row, on the
grounds that a backup nobody can find is not a backup and Home is the screen
that gets opened. A tab does that job better and costs Home's title row nothing
— that screen's subject is the training below it, not the application.

Settings holds this, §13's appearance override and §12.3's reset. Nothing else.
It is a **Pattern B** screen (§18) — every choice on it commits as it is made,
so there is nothing to leave unsaved.

### 12.3 Factory Reset

Puts the application back to the state of its first launch: every session, set,
exercise, template and preference gone, and the built-in catalogue planted
again.

**This was cut before it was built, and then built anyway.** The original
reasoning still holds and is worth keeping: Android already has this — *Clear
storage* does exactly it, while *Clear cache* does nothing at all, because the
database is in the files directory. What the reasoning missed is that a
platform setting three levels into system preferences is not a feature of this
application, and that iOS has no equivalent at all, so *delete the app* was the
only answer on half the target platforms.

**Two confirmations, and the second one carries the numbers.** A single dialog
naming no figure is one people learn to dismiss. The second states how many
sessions and sets are about to go, and **whether a copy of them exists** — which
is why the export records `export.last_at` in `meta` on success. Never having
exported is stated first and stated plainly, because it is the only case where
the right answer is probably to cancel.

The counted figures exclude soft-deleted rows even though the reset destroys
those too. The sentence exists to be checked against what the person believes
they have, and History has never shown them a deleted session.

**The schema is dropped and rebuilt, not emptied.** That is not a preference —
`DELETE` crashed the application natively, every time, and the reason is worth
knowing because it constrains anything else that ever deletes in bulk.

The database is opened with `enableChangeListener: true`, which registers
SQLite's update hook, and `expo-sqlite` emits one event **per row changed**.
Each crosses JNI and takes a global reference; the table holds 51,200. A reset
on a long history deletes about 126,000 rows, so it aborted around 40% of the
way through with `global reference table overflow` — a native abort, which no
`catch` in JavaScript can see. Nor was the row count the real ceiling: those
same events drive every live query, so a history small enough to survive would
still have re-run every mounted read tens of thousands of times.

`DROP TABLE` is DDL. It removes rows without visiting them, so no events fire
at all. Foreign keys are switched **off first and outside the transaction** —
with them on, `DROP TABLE` performs the row-by-row delete being avoided, and
the pragma is a no-op inside a transaction anyway. The drops are still atomic,
because DDL is transactional in SQLite.

`__drizzle_migrations` is dropped with everything else, which lets `migrate`
rebuild the schema on the connection that is already open. No reopening, no
relaunch, and no window where a screen holds a handle to a file that is gone —
which is what kept the file itself from being deleted instead.

**Emitting nothing has a cost, and it has to be paid explicitly.** Those change
events are also every screen's only reason to re-read, so after a reset the rows
were gone while Home still listed three plans. The reset therefore announces
itself directly (`lib/restart.ts`) and the navigator is remounted, which makes
each live query run again on mount. The one thing a reset cannot say through the
database, it says around it.

The table list is still **checked against the schema by a test**, so a table
added later cannot quietly survive a reset — the user is told the application is
factory-fresh, and anything left behind is invisible.

Clearing `meta` is what re-arms the seed, so the catalogue returns on its own.
The appearance preference lives there too and is meant to go: a factory reset
means the application you first opened, and that one followed the system.

The seed runs in **its own transaction afterwards**. It is idempotent and
guarded by the flag just cleared, so being killed in between leaves an empty
database that re-seeds on the next launch — the ordinary first-launch path, not
a broken state.

---

## 13. Appearance

Dark and light themes, following the system setting automatically, with manual
override.

**Three choices: System, Light, Dark.** System is the default and is what any
unreadable stored value falls back to — a preference must never cost a launch.
The choice is one row in `meta` (`TECH_STACK.md` §5.1), read synchronously
before the first frame: an override applied in an effect would show one frame of
the wrong theme on every launch.

It commits on the tap and applies before it is stored. The theme is what the tap
was for and should not wait on a disk write; the row is what makes it survive a
force-quit. It is the one write in the application not wrapped in a transaction,
because it is one row and cannot lose training history.

Direction: **quiet editorial.** Near-monochrome warm neutrals, hierarchy from
type scale rather than colour, rounded geometry, generous whitespace, and **no
accent** — Phase 8b deleted it, and `danger` is the only hue left. Emphasis is
weight, rule and solid ink.

Typeface is **Geist** with **Geist Mono** for all numeric display. Full token
set, component styles and composition rules are in `DESIGN.md`, which is
authoritative for anything visual.

**No illustration in v1.** Per-exercise doodles were considered and cut.

---

## 14. Deferred

Not built in v1. Recorded so the schema does not preclude them.

| Feature | Note |
|---|---|
| Full exercise catalogue | Seed data; expandable with no schema change |
| Highlights | Derived; an afternoon's work once history exists |
| Monthly / yearly recaps | Cannot be evaluated for a year |
| Calendar, search, filters | Not useful at low session counts |
| Exercise categories | Unnecessary at ~20 active exercises |
| Template duplication | Rare action |
| Bodyweight tracking | Separate concern |
| Supersets / paired exercises | Real gap, but adds session-model complexity |
| Progression as a tracked dimension | Currently encoded in exercise names |
| Import | Export first |
| Web client | `TECH_STACK.md` §11 |
| Cloud sync, accounts, backup | `TECH_STACK.md` §11 |
| Do Not Disturb automation | Not possible on iOS; use a Shortcuts automation |

---

## 15. Explicitly Cut

| Feature | Source | Reason |
|---|---|---|
| Skill dependency graph with gating | `requirements_one.md` §4.1 | Blocking yourself from logging a movement is hostile when you are the user |
| TUT state machine | §4.2 | It is the work timer with a different name |
| Weighted rope interval matrix | §4.3 | One exercise's metric config, not a subsystem |
| Proof-of-work heatmap | §4.4 | Gamification the design notes ban by name; nags on rest days |
| Fatigue / tendon load index | §4.5 | Prescribes rather than records; edges into medical claims; an invented risk number is worse than body signal |
| **Added load** | Seeded from the start, cut Aug 2026 | This is a bodyweight app. A weighted variant is its own exercise, which is already how progressions are modelled (§3.1), so the metric earned its place only by habit. Removing it also removes the last fractional value and the last unit that was not seconds. Migration 0004 **soft-deletes** the metrics and clears any target pointing at one; `set_metric_values` rows are untouched, so restoring it later is one preset entry and clearing `deleted_at`, not a reconstruction |
| **Rest timer** | Considered Aug 2026, cut before Phase 5 | A countdown that pushes you back to the bar works against the way this app is actually used — an unhurried two-hour session, one exercise at a time, at your own pace. Removed `expo-notifications` with it, and with that the scheduling, cancelling and deliver-to-a-killed-app machinery that was the largest part of the phase. `rest_seconds` dropped from `template_slots` by migration 0003 |
| ~~Factory reset~~ | Cut in Phase 11, **built in Phase 11** | The cut held for one afternoon. The reasoning was that Android already has this — *Clear storage* does exactly it, and *Clear cache* does nothing at all because the database is in the files directory. What it missed: a platform setting three levels into system preferences is not a feature of this application, and **iOS has no equivalent**, so *delete the app* was the only answer on half the target platforms. Specified in §12.3 and built as described there, two-step confirmation and all |
| Rating metric type | `reuirements_two.md` §8.6 | Removed by decision |
| Selection metric type | §8.6 | No remaining use case once progressions are names |
| Per-exercise doodles | Considered Aug 2026 | Twenty illustrations that must look like one hand drew them, for no functional gain. Reintroducing requires amending `DESIGN.md` |
| Custom metric registry | §11.5 | An entire CRUD surface for one user |
| Default vs optional metrics | §11.3–11.4 | Distinction without a difference at one user |
| Accounts and login | `fitness_app_readme.md` | No second user |
| Freemium tiers, subscriptions, ads | `fitness_app_readme.md` | Not a commercial product in v1 |
| Social, nutrition, AI coaching, wearables, media | All three | Out of identity |

---

## 16. Definition of Done

Version 1 is complete when it is possible to:

1. Create a template with exercises and targets
2. Start a session from it
3. Log sets quickly, with last session's values visible
4. Time a hold without leaving the application
5. Leave the application and return with the session intact
6. Be warned about untrained exercises before finishing
7. Raise a target in one tap when it was beaten
8. Quick-log five pull-ups outside of training
9. Activate a suggested exercise from the catalogue
10. Browse history and one exercise's full record
11. See what has not been trained recently
12. Export everything to a file

Without reading documentation.

---

## 17. Change Log

| Date | Change |
|---|---|
| Aug 2026 | Created. Supersedes feature content of all three prior documents. TENSION features cut; rating type removed; targets, quick log, ad-hoc sessions and export added. |
| Aug 2026 | Name finalised as Zoomies. Selection metric type removed; progressions encoded as exercise names. Active-library vs catalogue split added with family-based suggestions. Rest timer default set to 60s. Units set to kg / added load. Dashboard and analytics specified. Appearance direction noted. |
| Aug 2026 | `DESIGN.md` created and made authoritative for visuals. Per-exercise doodles cut. |
| Aug 2026 | Two §2 amendments found while building Phase 1. `suggestion_dismissed_at` added to `exercises` — §3.3 required dismissals to persist but nothing stored them. `target_metric_id` added to `exercise_entries` — the snapshot recorded the target's value but not which metric it belonged to, so rendering it meant reading through the template slot, which would have let a template edit rewrite completed sessions. |
| Aug 2026 | Two amendments after reviewing Phase 2. §3.3 now states that archived exercises still count toward owned families — "active" was ambiguous between `is_active` and not-archived, and the narrower reading hid suggestions at the moment archiving made them most relevant. §3.5 names the Archived screen, which the spec had assumed without ever describing, leaving archiving one-way in the build. |
| Aug 2026 | Phase 3 amendments. §5 now says templates live on Home — the spec defined them fully but never said how they are reached, the same omission §3.5 had for archiving. §5.2 records that templates themselves do not reorder, and that deleting one takes its slots, which is the opposite of the call made for an exercise's metrics and for the opposite reason: nothing points at a slot. |
| Aug 2026 | Phase 6 amendments. §2 gains `template_slot_id` on `exercise_entries` and a storage rule saying what it is not: provenance for the raise prompt, never a target source, because reading a target through it would undo the snapshot two rows above it. The raise had nowhere to write otherwise — an entry knew its exercise, and §5.2 lets one exercise fill two slots with different targets. §6.6 rewritten around three things implementation forced into the open: a majority is strictly more than half and a tie is not a beat; the write goes to the slot and never to the completed session; and **a raise may never be a lowering**, so it is gated on the slot's own figure rather than on the possibly-overridden target that was trained against. §2 also lost `rest_seconds`, which Phase 5 dropped from the schema and from §5.1 but not from the data-model block. |
| Aug 2026 | Phase 9 amendments. §11.3 goes from five blocks to four. The **days-trained grid** replaces both *Last 7 days* and the 12-week *Sessions per week* bar chart — it answers the week and the quarter in one object made of `View`s, and with the chart went the only reason the dashboard needed a plotting stack. The streak objection was settled deliberately rather than assumed: a filled-square calendar is the most streak-coded object in software, and the three mechanisms that make it one are a count, an intensity ramp and a fixed grid of blank past. None is present, and §11.1 already forbade the second. *This week* became **28 days** — a week holds nought to four sessions and says nothing either way — and its *sets* figure became **quick logs**, because the grid above already draws this week and §11.5's exclusion was the thing worth making visible rather than silent. *Not trained recently* is now sorted by the gap **with the date beside it**, so a movement deliberately stopped reads as a fact rather than a debt, and excludes never-trained and anything under a week. *Recent records* now requires a set to have **beaten** something: a first-ever set is a baseline, and without the rule month one is a wall of records. §10.2 records that the trend is now the sole justification left for `victory-native`. |
| Aug 2026 | Phase 9 fixes, from the first run on device. The **days-trained grid** was sized by how new the user is: `flex-1` over however many columns the history filled gave week two two columns and squares the width of a thumb. §11.3 now separates the two rules that were tangled into one — the grid is **always thirteen columns wide**, and it **draws from the first logged day**, holding the earlier columns open and blank. Blank now means *outside the record* at either end rather than *not yet happened*, so the first column is ragged at the top exactly as the last is ragged at the bottom. §9 gains the timeline's row rules and its one-line rule, and loses two stale sentences: it has not been grouped by day since Phase 8b, and a quick log carries a `ONE-OFF` tag rather than the words `Quick log`. |
| Aug 2026 | Phase 10. §12 gains **§12.1**, which states what the file says and why: every table discovered from the schema, every column via `SELECT *`, soft-deleted rows kept, nothing aggregated or renamed. The first three all guard the same failure — a list kept by hand works until someone adds to the schema, and then every backup taken before anyone notices is quietly incomplete. `version` and `schemaVersion` are two numbers because the envelope and the rows change independently, and the second release cannot add a version to files already written. **§12.2** puts it in Settings, reached from Home — a backup nobody can find is not one. §13 gains the three choices and how the override is applied: at module scope before the first frame, because an effect runs after a render and would flash the wrong theme on every launch, and falling back to System on anything unreadable because a preference must never cost a launch. §13 also lost its accent — the text still described moss in three places, deleted in Phase 8b. |
| Aug 2026 | Phase 11, the last phase. **§10.2 is rewritten from why the trend is absent to how it is drawn**: dots never a line, positioned by date rather than one per session — the second follows from the first, and dropping it would make a three-week gap look like three consecutive days. Y labels fixed to the all-time low and high and pinned outside the scroll, because an axis that rescaled with the visible window would make one dot height mean two numbers. The window ends on the last session rather than on today, unlike §11.3's grid: the grid asks whether you are showing up, so empty columns are its answer, and this asks whether a movement is going anywhere. **§15 gains the factory reset**, cut because Android already has one — *Clear storage* works and *Clear cache* does nothing at all, the database being in the files directory — with iOS having no equivalent recorded as the condition that reopens it, and the shape it would take written down so the decision is not made twice. §11.3's grid stops being capped at thirteen columns and starts scrolling instead: the cap became a floor, which made every earlier week reachable and cost one sign in one comparison. |

---

## 18. Leaving a Screen

Every screen that writes is one of two kinds, and **which kind it is must be
visible from the screen itself.** The rule exists because the alternative was
found by using the app: screens that committed silently and could only be left
by pressing the system Back, with nothing confirming anything had been kept.

### Pattern A — Draft

Fields are held in memory. The section ends in **Discard** and **Save**; Save
writes and navigates. Leaving with unsaved changes asks: **Save · Discard ·
Cancel**.

Save is disabled until something has changed, so "is there anything pending" is
answered by looking rather than by remembering.

### Pattern B — Action

Every tap commits as it is made — adding a slot, reordering a metric, archiving.
The screen ends in a single **Done** that only navigates.

**No Discard.** Undoing a reorder or a removal is an undo stack, which is a
different feature; taking back an addition is the control on the row that made
it. A Discard that only sometimes means what it says is worse than none.

### Mixed screens

A screen may hold one drafted field among actions — a template's name, a
metric's name. The draft's actions sit **inside the draft's own section**, never
at the foot of the screen, because a Save at the bottom appears to own
everything above it. That was true of the exercise editor, where pressing Save
after adding a metric implied the metric had been pending when it was already
stored.

A drafted field anywhere on a screen must reach that screen's exit guard, or
leaving throws it away without asking.

### Both exits, always

The on-screen Back and the Android system Back must do the same thing, including
any confirmation. An override the hardware ignores is worse than no override,
because it teaches a rule the device then breaks.

### The exception: training writes as you type

Anything typed **during training** keeps writing per keystroke:

- the per-exercise note (§7.5)
- the session note at completion (§7.5)

Set logging is unaffected — it already has an explicit Save, and it commits
before any transition (invariant 1).

These are the only fields typed while a session is live, and a force-quit
mid-session is the scenario this application is built around. A draft is a
promise to write later, and during training there is no later worth trusting.
Planning is different: nothing is lost by a template's name waiting for a
button.

---
