import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { newId } from '../lib/ids';

/**
 * The single schema definition. Types are inferred from it and never written
 * alongside it. FEATURES.md §2 is authoritative for the shape.
 *
 * Two rules do most of the work here:
 *
 *   A set stores no measurements. It records that an effort happened; the
 *   values live one table down in `set_metric_values`, one row per metric.
 *   `12 reps @ +10kg` is one `sets` row and two `set_metric_values` rows. This
 *   exists so changing an exercise's metrics never touches historical data.
 *   Do not "simplify" it into columns on `sets`.
 *
 *   Nothing aggregated is stored. `24 reps` is a SUM at read time.
 */

/** Epoch milliseconds, per TECH_STACK.md §4.3. */
const now = () => Date.now();

/** Every user-owned table carries these. Soft delete only. */
const lifecycle = {
  createdAt: integer('created_at').notNull().$defaultFn(now),
  updatedAt: integer('updated_at').notNull().$defaultFn(now),
  deletedAt: integer('deleted_at'),
};

const primaryKey = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => newId());

// ---------------------------------------------------------------------------
// meta
// ---------------------------------------------------------------------------

/**
 * The documented exception to the UUID-key rule: a key/value store, not user
 * data. Holds the seed flag so the catalogue is planted once and never again
 * (TECH_STACK.md §4.5). Nothing here is soft-deleted.
 */
export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull().$defaultFn(now),
});

// ---------------------------------------------------------------------------
// exercises
// ---------------------------------------------------------------------------

export const exercises = sqliteTable(
  'exercises',
  {
    id: primaryKey(),
    name: text('name').notNull(),
    /** Curated grouping that drives suggestions — not string similarity. */
    family: text('family'),
    notes: text('notes'),
    isBuiltin: integer('is_builtin', { mode: 'boolean' })
      .notNull()
      .default(false),
    /** Appears in pickers and the Exercises tab. Roughly fifteen on install. */
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
    isArchived: integer('is_archived', { mode: 'boolean' })
      .notNull()
      .default(false),
    /**
     * Set when the user dismisses this exercise from the Suggested section.
     * Dismissals do not return (FEATURES.md §3.3).
     */
    suggestionDismissedAt: integer('suggestion_dismissed_at'),
    ...lifecycle,
  },
  (t) => [
    index('exercises_family_idx').on(t.family),
    index('exercises_is_active_idx').on(t.isActive),
  ],
);

export const exerciseMetrics = sqliteTable(
  'exercise_metrics',
  {
    id: primaryKey(),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** No rating type and no selection type. See FEATURES.md §4. */
    type: text('type', { enum: ['number', 'duration', 'notes'] }).notNull(),
    /** Display only — `reps`, `kg`, `s`. */
    unit: text('unit'),
    /** The first metric is the primary metric and drives the logging UI. */
    displayOrder: integer('display_order').notNull(),
    ...lifecycle,
  },
  (t) => [index('exercise_metrics_exercise_id_idx').on(t.exerciseId)],
);

// ---------------------------------------------------------------------------
// templates
// ---------------------------------------------------------------------------

export const templates = sqliteTable('templates', {
  id: primaryKey(),
  name: text('name').notNull(),
  displayOrder: integer('display_order').notNull(),
  ...lifecycle,
});

export const templateSlots = sqliteTable(
  'template_slots',
  {
    id: primaryKey(),
    templateId: text('template_id')
      .notNull()
      .references(() => templates.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id),
    displayOrder: integer('display_order').notNull(),
    /** Null means no target; the counter shows completed sets only. */
    targetSets: integer('target_sets'),
    targetMetricId: text('target_metric_id').references(
      () => exerciseMetrics.id,
    ),
    targetValue: real('target_value'),
    /**
     * Nullable on purpose — this does the work a logging-mode flag would have
     * done. Null means no rest timer, so handstand practice is not interrupted
     * by a countdown (FEATURES.md §5.1).
     */
    restSeconds: integer('rest_seconds').default(60),
    ...lifecycle,
  },
  (t) => [
    index('template_slots_template_id_idx').on(t.templateId),
    index('template_slots_exercise_id_idx').on(t.exerciseId),
  ],
);

// ---------------------------------------------------------------------------
// sessions
// ---------------------------------------------------------------------------

export const sessions = sqliteTable(
  'sessions',
  {
    id: primaryKey(),
    /** Null for ad-hoc sessions and quick logs. */
    templateId: text('template_id').references(() => templates.id),
    name: text('name'),
    startedAt: integer('started_at').notNull(),
    /** Null while the session is still in progress. */
    completedAt: integer('completed_at'),
    /** Set only by an explicit user pause. Leaving the app is not pausing. */
    pausedAt: integer('paused_at'),
    accumulatedPauseMs: integer('accumulated_pause_ms').notNull().default(0),
    /** Quick logs never count toward the sessions figure (FEATURES.md §11.5). */
    isQuickLog: integer('is_quick_log', { mode: 'boolean' })
      .notNull()
      .default(false),
    notes: text('notes'),
    ...lifecycle,
  },
  (t) => [
    index('sessions_started_at_idx').on(t.startedAt),
    index('sessions_completed_at_idx').on(t.completedAt),
    index('sessions_template_id_idx').on(t.templateId),
  ],
);

export const exerciseEntries = sqliteTable(
  'exercise_entries',
  {
    id: primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id),
    displayOrder: integer('display_order').notNull(),
    /**
     * Snapshotted from the template slot at session start, including which
     * metric the target refers to. Editing a template later must not rewrite
     * what a completed session says.
     */
    targetSets: integer('target_sets'),
    targetMetricId: text('target_metric_id').references(
      () => exerciseMetrics.id,
    ),
    targetValue: real('target_value'),
    notes: text('notes'),
    /** Added mid-session; carries no target and leaves the template untouched. */
    isAdHoc: integer('is_ad_hoc', { mode: 'boolean' }).notNull().default(false),
    ...lifecycle,
  },
  (t) => [
    index('exercise_entries_session_id_idx').on(t.sessionId),
    index('exercise_entries_exercise_id_idx').on(t.exerciseId),
  ],
);

// ---------------------------------------------------------------------------
// sets
// ---------------------------------------------------------------------------

/** One recorded effort. Deliberately holds no measurements. */
export const sets = sqliteTable(
  'sets',
  {
    id: primaryKey(),
    exerciseEntryId: text('exercise_entry_id')
      .notNull()
      .references(() => exerciseEntries.id, { onDelete: 'cascade' }),
    setIndex: integer('set_index').notNull(),
    /** Eight clean reps and eight grinding reps are different data. */
    toFailure: integer('to_failure', { mode: 'boolean' })
      .notNull()
      .default(false),
    performedAt: integer('performed_at').notNull(),
    ...lifecycle,
  },
  (t) => [index('sets_exercise_entry_id_idx').on(t.exerciseEntryId)],
);

/**
 * One row per metric per set.
 *
 * Both value columns are nullable and stay that way: null means not recorded,
 * zero means zero. An unrecorded value is never written as 0 and displays as
 * `—`.
 */
export const setMetricValues = sqliteTable(
  'set_metric_values',
  {
    id: primaryKey(),
    setId: text('set_id')
      .notNull()
      .references(() => sets.id, { onDelete: 'cascade' }),
    exerciseMetricId: text('exercise_metric_id')
      .notNull()
      .references(() => exerciseMetrics.id),
    /** Numbers and durations. Durations are seconds; load is added kg. */
    valueNum: real('value_num'),
    /** Free text metrics. */
    valueText: text('value_text'),
    ...lifecycle,
  },
  (t) => [
    index('set_metric_values_set_id_idx').on(t.setId),
    index('set_metric_values_exercise_metric_id_idx').on(t.exerciseMetricId),
  ],
);
