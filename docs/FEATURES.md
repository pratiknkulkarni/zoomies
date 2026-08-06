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
  target_sets, target_metric_id, target_value, rest_seconds

sessions
  id, template_id (nullable), name,
  started_at, completed_at (nullable),
  paused_at (nullable), accumulated_pause_ms,
  is_quick_log, notes

exercise_entries
  id, session_id, exercise_id, display_order,
  target_sets, target_metric_id, target_value,
                                      -- snapshotted from slot at start
  notes, is_ad_hoc

sets
  id, exercise_entry_id, set_index, to_failure, performed_at

set_metric_values
  id, set_id, exercise_metric_id, value_num, value_text
```

### 2.1 Storage Rules

- **A set stores no measurements.** Values live one table down, one row per
  metric. `12 reps @ +10kg` is one `sets` row and two `set_metric_values` rows.
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
- **Load is added load, in kg. Durations are seconds.**

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
| **Number** | `value_num` | reps, added load (kg) |
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
- Units are declared per metric (`reps`, `kg`, `s`) and are display-only.

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
| `rest_seconds` | Default **60**. Editable per slot. Nullable = no rest timer |

**`rest_seconds` being nullable does the work a logging-mode flag would have
done.** Ring support holds get a rest timer. Handstand practice can have none, so
short repeated attempts are not interrupted by a countdown.

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

  Target      4 × 8  +10kg
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

On set saved, timer complete, and target reached. Feedback without looking at the
screen.

---

## 8. Timers

Two, both optional.

**Work timer** — for duration exercises. Populates the duration metric. Manual
entry always possible.

**Rest timer** — starts automatically after saving a set when the slot has
`rest_seconds`. Default 60 seconds, editable per template slot. Pausable,
skippable, restartable. Never blocks interaction.

### 8.1 Correctness Rules

- Timers derive from a **start timestamp**, never accumulated `setInterval`
  ticks. Returning after 90 seconds in another app shows the correct elapsed
  time.
- Starting a rest timer schedules a **local notification** for its end time. It
  fires even if the application is suspended or killed.
- `expo-keep-awake` is active for the duration of a session.

---

## 9. History

**Timeline** — reverse-chronological list of completed sessions. Date, name,
duration, exercise count.

**Session detail** — everything logged, per set, with notes.

**Edit and delete** completed sessions. Deleting removes its entries and sets;
the exercises remain.

Calendar, search and filters are deferred. A scrolling list is sufficient at this
volume.

---

## 10. Exercise Details

The lifetime view of one movement, reached from the Exercises tab. Not a session
screen. This is the payoff for making Exercise permanent.

**v1:**
- Every set ever logged, newest first, with its session and date
- Personal records per metric — most reps, longest hold, heaviest added load
- Best-set trend over time
- Which sessions it appeared in
- Its metric configuration

Unlike the session screen, this view spans **all** templates and includes quick
logs.

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

Five blocks, in order. Nothing else.

**This week** — sessions and sets. Two numbers, small type. Not a hero element.

**Last 7 days** — a row of seven dots, filled if trained that day. Factual and
glanceable, with no counter attached.

*This is deliberately not a streak.* No number, no reset, no flame, no penalty
for a rest day. It shows the week; it does not score it.

**Sessions per week** — bar chart, last 12 weeks. The most useful consistency
trend. Needs roughly three months of data before it says anything, so it ships
late.

**Not trained recently** — three to five active exercises sorted by days since
last logged. `Ring Dip — 19 days`. Directly answers the design notes' question
"what exercises have I neglected." Cheap to compute and useful from week two.

**Recent records** — personal records set in the last 30 days.
`Ring Support Hold — 42s, up from 38s`. Factual, no celebration.

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

Four of the five blocks are near-empty for the first month. Ship **Not trained
recently** and **Recent records** first — they work from week two. Hold the
charts until twelve weeks of data exist.

---

## 12. Data Export

Local JSON export of the entire database, via `expo-file-system` and
`expo-sharing`. Free, in v1, no server involved.

With no cloud in v1, **this is the only backup**. Non-negotiable.

Import is deferred, but the export format should be designed so import is
possible later.

---

## 13. Appearance

Dark and light themes, following the system setting automatically, with manual
override.

Direction: **quiet editorial.** Near-monochrome warm neutrals, hierarchy from
type scale rather than colour, rounded geometry, generous whitespace, one muted
accent used in exactly three places.

Typeface is **Geist** with **Geist Mono** for all numeric display. Accent is
moss. Full token set, component styles and composition rules are in `DESIGN.md`,
which is authoritative for anything visual.

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
