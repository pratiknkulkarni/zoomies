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
