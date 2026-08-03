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
