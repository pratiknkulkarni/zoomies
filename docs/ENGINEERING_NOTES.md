# Engineering Notes

**Project:** Zoomies
**Document Type:** Decisions and their reasoning — not a spec
**Status:** Narrative. `FEATURES.md`, `DESIGN.md` and `TECH_STACK.md` remain
authoritative for what the application is; this records *why* the interesting
calls went the way they did, including the ones that turned out wrong.

A decision is only worth writing down with the argument that produced it and the
evidence that settled it. Several entries below record a position being
reversed, because those are the ones worth re-reading.

---

## 1. Performance: bounded reads

### 1.1 The symptom

On a database holding **19 years — 3,724 sessions, 50,707 sets** — the
application was slow in three unrelated-looking ways:

- Look back took 1.5–2s to appear.
- Saving one set took 2–4s before the UI moved.
- Discarding a session left `Resume` on Home for ~3s afterwards.

### 1.2 Measuring before theorising

Choreographer's `Skipped N frames` was the first instrument, at 16.7ms a frame:

| tab | main thread blocked |
|---|---|
| History (3,724 sessions) | 0ms |
| Exercises | 0ms |
| **Look back** | **2,338ms** |

History renders 3,724 rows with no jank because `FlatList` virtualises — only
the visible rows are built. Look back's grid builds **every** column: 1,000
weeks × 7 days = 7,000 `View`s in one commit.

The set save showed **0 blocked frames** and still took 4s, which located it
immediately: React Native runs JS on its own thread, so anything Choreographer
cannot see is not rendering. Measured by polling screenshots for the pixel
change:

| condition | tap → UI updated |
|---|---|
| Look back / History / Exercises visited | **3,955ms** |
| fresh launch, only Home + session mounted | **524ms** |

Same database, same action, 7.5× apart. **The variable was which tabs had been
opened.**

### 1.3 The mechanism

`drizzle-orm/expo-sqlite`'s `useLiveQuery` re-runs the **whole** query on any
change to its root table, and unsubscribes only on unmount:

```js
listener = addDatabaseChangeListener(({ tableName }) => {
  if (config.name === tableName) { query.then(handleData) }   // no diff, no window
});
return () => listener?.remove();                              // unmount only
```

React Navigation keeps tab screens mounted after their first visit. So once
every tab had been opened, inserting one set re-ran:

- `sets` changed → `liveSetRefs` (50,707) + `trainedAtRefs` ×2 (101,414)
- `set_metric_values` changed → `rankableValues` (54,642)

**≈206,000 rows re-read, serialised across the bridge and re-allocated as JS
objects, per set logged.**

### 1.4 The fix: fold in SQL, not in JavaScript

The queries were not badly written. Every plan used an index; there was no
missing index and no accidental cartesian join. They were **correct queries that
asked for everything**, because the folding happened in JS afterwards:

```ts
// db/queries/history.ts — before
export function liveSetRefs() { /* one row per set, ever */ }
export function countBySession(rows) {           // 50,707 in
  for (const row of rows) counts.set(...);       // 3,724 out
}
```

`GROUP BY` does the same fold inside SQLite and returns only the answers:

| read | before | after |
|---|---|---|
| set counts per session | 50,707 rows | **3,724** |
| last trained per exercise | 50,707 rows | **11** |
| days trained (13-week grid) | 50,707 rows | **620** |
| records: values + prior best | 54,642 rows | **273 + 12** |
| **Look back total to JS** | **105,349** | **916** |

**The invariant this looks like it breaks, and does not.** Invariant 3 says
*never store aggregates*. A `set_count` column would be a second source of truth
that a corrected set could not reach — that is the failure it guards. A
`GROUP BY` evaluated at read time is still computed from the rows every time it
is read. The invariant is about **storage**, not about which engine does the
arithmetic, and reading it as the latter cost about three and a half seconds.

**Honest caveat: SQL time barely moved** — 320ms before, 325ms after. SQLite
scans the same rows either way. What collapsed is the bridge crossing and the JS
allocation, which is where the four seconds actually were. If the diagnosis had
stopped at "the SQL is slow", the fix would have been wasted effort.

### 1.5 The window that could be pushed down after all

`rankableValues` carried a comment explaining why the 30-day window *could not*
be pushed into the query: a record means beating everything before it, so
everything before it is needed.

True, and the wrong conclusion. **Everything before it collapses to one number
per exercise and metric.** So the read became two small queries — the window,
and `MAX(value)` before the window — and `recentRecords` takes the second as a
seed rather than rediscovering it by walking history. Same answers, 54,642 rows
down to a few dozen.

### 1.6 An index, and where an index stops helping

`sets` had no index on `performed_at`, so every windowed read scanned the table:

| query | no index | with index |
|---|---|---|
| `trainedDaysSince` (13 weeks) | 8.0ms | **1.1ms** |
| `valuesSince` (30 days) | 48.5ms | **0.8ms** |
| `bestBeforePerMetric` (30 days) | 175.1ms | 178.1ms |

The third is the interesting one. It asks for everything *before* a window,
which on a long history is nearly the whole table — and **an index does not help
you read 99% of the rows**. It is slow for a reason no index can fix, and 175ms
once per screen is where it is right to stop.

---

## 2. Decisions worth re-reading

### 2.1 UUID v7 keys, generated on the device

Chosen over auto-increment integers before there was any sync to justify it. Two
devices offline for a week cannot mint the same id, and no row needs a
round-trip to be created. It also makes ids sort chronologically, which several
reads use as a tiebreak — `personalRecords` and `recentRecords` both break ties
with "the smaller id is the older row", which a v4 would make random.

### 2.2 A set stores no measurements

`sets` records that an effort happened; `set_metric_values` holds one row per
metric. `12 reps, felt strong` is one set row and two value rows.

The payoff is that changing an exercise's metrics never touches historical data.
The cost is that every read is a join and every fold has a second level. It is
the schema decision most likely to look like over-engineering and most expensive
to reverse.

### 2.3 Null means not recorded; zero means zero

A value the user did not enter is `NULL`, never `0`, and renders as `—`. This
reaches further than it looks: it is why `MAX()` returning null has to stay
absent rather than becoming a date, why the trend must not plot an unrecorded
rep at the bottom of its range, and why the export writes explicit nulls rather
than letting `JSON.stringify` drop the keys.

### 2.4 Timers derive from timestamps

Never accumulated `setInterval` ticks. Backgrounding the app for 90 seconds must
not lose 90 seconds, and the only way to guarantee that is to store when
something started and subtract.

### 2.5 Soft delete everywhere

`deleted_at` rather than `DELETE`. Makes deletion an ordinary field change,
which is what would make replication tractable if sync is ever built — and is
why the export has to *keep* deleted rows, since filtering them would make a
restore silently discard decisions the user made.

### 2.6 Every live query is rooted at the table it must react to

`useLiveQuery` subscribes to one table — the query root. A single joined query
would answer every question on a screen and react to none of them properly. So
Look back makes six queries instead of one. §1.3 above is the bill for that
design; the design is still right, and what was wrong was how much each query
returned.

---

## 3. Bugs worth remembering

### 3.1 A NUL byte in a source file

`recentRecords` grouped by `` `${exerciseId}\0${metricId}` `` — the separator
looked like a space and was `U+0000`. It had been harmless for as long as the
same expression built both sides of the comparison. It surfaced the moment a
second module needed to construct the same key.

It also explained something that had been quietly wrong for weeks: `grep`
returned nothing for strings that were plainly in the file, because a NUL makes
it treat the file as binary. **The tool had been telling me for weeks and I read
it as my own mistake.**

### 3.2 `scrollToEnd` that scrolled nowhere

Both charts opened on the oldest weeks. `scrollToEnd({ animated: false })` in
`onContentSizeChange` did nothing. Instrumenting showed the callback firing with
correct numbers and a live ref — so the call was made and the view ignored it.
The native scroll view has not adopted the new content size at the moment that
callback runs, so the scroll clamps to bounds one screen wide. Fixed by using
the width the callback is handed and deferring one frame.

**The unit tests could not have caught this and did not.** Every number was
already right; the defect was entirely in when a native view would accept being
told where to sit.

### 3.3 A nineteen-year range that read as eight weeks

`formatDayRange` never stated the year, on the reasoning that `28 Dec – 3 Jan`
is six days and the year is noise. Correct reasoning, wrong test: crossing a New
Year is not what makes a bare date ambiguous — **length** is. Now years appear
past 365 days.

### 3.4 A migration that would have broken every install

`drizzle-kit generate` emitted a migration containing three statements: the new
index, plus re-adding a column added in 0005 and re-dropping one dropped in
0003. Its snapshots had drifted — `0005_snapshot.json` recorded neither change —
so it diffed against a state three changes stale.

Verified against a real database: as generated it fails with
`duplicate column name: template_slot_id`. **Generated code is still code, and
this one had to be read before it was trusted.**

### 3.5 A reset that could not delete

The factory reset discovered its table list from the schema, alphabetically, and
relied on `PRAGMA defer_foreign_keys` to make the order irrelevant. The pragma
silently did nothing inside Drizzle's transaction and the reset failed on
`DELETE FROM exercise_metrics` — second alphabetically, still referenced by
every row in `set_metric_values`.

Replaced with an explicit child-before-parent order, which cannot be defeated by
a pragma failing to apply, plus a test asserting the list still covers every
table in the schema. **Prefer an ordering that cannot fail over a mechanism that
makes ordering unnecessary.**

---

## 4. Things deliberately not built

- **Streak counters.** A filled-square calendar is the most streak-coded object
  in software; this one carries no count, no current run and no reset penalty,
  which is the entire difference between a record and a scoreboard.
- **A charting library.** `DESIGN.md` §7 forbids axes, gridlines, tooltips,
  gestures and animation — which is every feature such a library sells. Both
  charts are `View`s.
- **A factory reset** — cut, then built anyway when the reasoning turned out to
  be half right. Android's *Clear storage* does it; iOS has no equivalent, so
  "delete the app" was the answer on half the target platforms.
- **Cloud sync.** Designed but not built — see `SYNC.md`. The design is worth
  reading for one observation: the data that must never be lost is the data that
  cannot conflict, because sets are insert-only from one device with a globally
  unique id.
