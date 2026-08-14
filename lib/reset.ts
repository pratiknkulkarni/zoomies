import { daysBetween } from './days';
import { formatShortDate } from './format';

/**
 * The words a factory reset is confirmed with (FEATURES.md §12.3).
 *
 * Pure, and here rather than in the screen, because the sentences are the whole
 * safety mechanism. A reset has no undo and no backup behind it — with no sync
 * in v1 the export is the only copy — so the second confirmation has to state
 * the size of the loss and whether a copy exists. Those two sentences are worth
 * testing; a dialog is not.
 */

/** What the reset destroys, as the user would recognise it. */
export type Loss = { sessions: number; sets: number };

/**
 * The order the tables are emptied in: **children before the rows they point
 * at.**
 *
 * Written out rather than discovered, which is the opposite of the choice
 * `lib/export.ts` makes and is the right one here. The export only has to name
 * every table; this has to name them in an order foreign keys allow, and
 * nothing in a Drizzle schema states which table depends on which in a form
 * that can be sorted.
 *
 * The first attempt did discover them, alphabetically, and deferred the
 * constraint checks to commit with `PRAGMA defer_foreign_keys`. **The pragma
 * silently did nothing** through Drizzle's transaction, and the reset failed on
 * `DELETE FROM exercise_metrics` — second alphabetically, and still pointed at
 * by every row in `set_metric_values`. An order that does not need a pragma
 * cannot be defeated by one not taking effect.
 *
 * Completeness is kept by a test rather than by construction: the sorted
 * contents of this list must equal `exportedTableNames`, so a table added to
 * `db/schema.ts` fails the suite until it is placed here deliberately. That is
 * the property worth protecting — a reset that leaves rows behind tells the user
 * the application is factory-fresh while something invisible survived.
 */
export const RESET_ORDER = [
  'set_metric_values',
  'sets',
  'exercise_entries',
  'sessions',
  'template_slots',
  'templates',
  'exercise_metrics',
  'exercises',
  'meta',
] as const;

/**
 * `139 sessions and 1,827 sets`.
 *
 * **Counted, never rounded.** `a lot of training` is not a number anyone can
 * check against what they think they have, and the point of the sentence is to
 * be checkable — it is the last thing read before the data goes.
 *
 * Grouped with separators, unlike every other figure in the application. Those
 * are set in mono at metric sizes and are two or three digits; this is a
 * four-digit number inside a sentence, where `1827` is read as a year.
 */
export function describeLoss(loss: Loss): string {
  const sessions = `${loss.sessions.toLocaleString()} ${
    loss.sessions === 1 ? 'session' : 'sessions'
  }`;
  const sets = `${loss.sets.toLocaleString()} ${
    loss.sets === 1 ? 'set' : 'sets'
  }`;

  return `${sessions} and ${sets}`;
}

/**
 * What to say about the backup, which is the part that decides the answer.
 *
 * **Never exported is stated first and stated plainly.** It is the only case
 * where the right action is probably to cancel, and a sentence that buried it
 * behind the count would be describing the loss without mentioning that it is
 * total.
 *
 * A stale export is its own warning: `you last exported 34 days ago` says the
 * copy exists and says how much of the training is missing from it, which is
 * more useful than a date alone at the moment of deciding.
 */
export function describeLastExport(
  lastExportAt: number | null,
  now: number,
): string {
  if (lastExportAt === null) {
    return 'You have never exported, so there is no copy of any of it.';
  }

  const days = daysBetween(lastExportAt, now);

  if (days <= 0) {
    return 'You exported today.';
  }

  if (days === 1) {
    return 'You last exported yesterday.';
  }

  return `You last exported ${days} days ago, on ${formatShortDate(
    lastExportAt,
  )}.`;
}

/**
 * The whole second-step message.
 *
 * Assembled here rather than in the component so that the order is fixed: the
 * loss, then the backup, then the irreversibility. The last clause goes last
 * because it is the one that should still be in mind at the button.
 */
export function describeReset(
  loss: Loss,
  lastExportAt: number | null,
  now: number,
): string {
  return [
    `This deletes ${describeLoss(loss)}, every exercise you have added, and every template.`,
    describeLastExport(lastExportAt, now),
    'It cannot be undone.',
  ].join('\n\n');
}
