/**
 * `display_order` maintenance, shared by everything the user can reorder.
 *
 * Two tables carry a `display_order` that the user arranges by hand:
 * `exercise_metrics` (which measurement is primary) and `template_slots` (what
 * order exercises are trained in). They mean entirely different things and the
 * arithmetic is identical, so it lives here once.
 *
 * The write is a callback rather than a table argument. Passing the table would
 * mean fighting Drizzle's generics for no benefit; passing the update keeps
 * every caller fully typed against its own schema.
 */

type Ordered = { id: string; displayOrder: number };

/**
 * Writes `display_order` as 0..n-1 over `next`, skipping rows already sitting
 * at the right index.
 *
 * Renumbering the whole set rather than swapping two values also heals any gap
 * an earlier delete left behind, which keeps "the first one is the primary
 * one" true rather than approximately true.
 */
export async function renumber(
  previous: Ordered[],
  next: { id: string }[],
  write: (id: string, displayOrder: number) => Promise<unknown>,
): Promise<void> {
  const before = new Map(previous.map((row) => [row.id, row.displayOrder]));

  for (const [index, row] of next.entries()) {
    if (before.get(row.id) === index) {
      continue;
    }

    await write(row.id, index);
  }
}

/**
 * The result of moving one row a single place, or `null` when the move would
 * fall off either end and there is nothing to write.
 */
export function movedOnePlace<T extends { id: string }>(
  ordered: T[],
  id: string,
  direction: 'up' | 'down',
): T[] | null {
  const from = ordered.findIndex((row) => row.id === id);
  const to = direction === 'up' ? from - 1 : from + 1;

  if (from === -1 || to < 0 || to >= ordered.length) {
    return null;
  }

  const moved = ordered[from];
  if (!moved) {
    // Unreachable: `from` was found above. Throwing beats silently dropping a
    // row from the ordering, which is what returning the spliced array would
    // do.
    throw new Error(`Row ${id} vanished between lookup and move`);
  }

  const next = [...ordered];
  next.splice(from, 1);
  next.splice(to, 0, moved);

  return next;
}
