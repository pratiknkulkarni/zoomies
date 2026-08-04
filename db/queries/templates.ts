import { and, asc, eq, isNull } from 'drizzle-orm';

import { db } from '../client';
import { templateSlots, templates } from '../schema';

/**
 * Reads for templates and their slots. Every function returns a query builder,
 * not a result — components hand it to `useLiveQuery` and never refetch.
 *
 * **Each query is rooted at the one table it depends on.** `useLiveQuery`
 * subscribes to a single table, the root of the query, so a template list that
 * joined its slots in would never refresh when a slot changed. Slots are read
 * separately and joined in memory by `indexSlotsByTemplate`, and the exercise a
 * slot names comes from `indexExercisesById` in `./exercises`. The same
 * constraint shaped the exercise library in Phase 2.
 */

export type Template = typeof templates.$inferSelect;
export type TemplateSlot = typeof templateSlots.$inferSelect;

/** Soft delete is the only delete, so this predicate belongs on every read. */
const liveTemplate = isNull(templates.deletedAt);
const liveSlot = isNull(templateSlots.deletedAt);

/**
 * Every template, in the order the user arranged them. Ordered by
 * `display_order` rather than name because a training week has a shape —
 * Pull Day before Push Day is a decision, not an accident of the alphabet.
 */
export function allTemplates() {
  return db
    .select()
    .from(templates)
    .where(liveTemplate)
    .orderBy(asc(templates.displayOrder));
}

/** One template, for its detail screen. */
export function templateById(id: string) {
  return db
    .select()
    .from(templates)
    .where(and(liveTemplate, eq(templates.id, id)))
    .limit(1);
}

/**
 * One template's slots, in session order. `display_order` here is the order
 * exercises are trained in — unrelated to `exercise_metrics.display_order`,
 * which orders the measurements within a single exercise.
 */
export function slotsForTemplate(templateId: string) {
  return db
    .select()
    .from(templateSlots)
    .where(and(liveSlot, eq(templateSlots.templateId, templateId)))
    .orderBy(asc(templateSlots.displayOrder));
}

/**
 * Every live slot, for the list rows that count what a template contains.
 * Rooted at `template_slots` so adding or removing one refreshes the list.
 */
export function allSlots() {
  return db
    .select()
    .from(templateSlots)
    .where(liveSlot)
    .orderBy(asc(templateSlots.displayOrder));
}

/** Groups the result of `allSlots` by template, preserving session order. */
export function indexSlotsByTemplate(
  slots: TemplateSlot[],
): Map<string, TemplateSlot[]> {
  const byTemplate = new Map<string, TemplateSlot[]>();

  for (const slot of slots) {
    const existing = byTemplate.get(slot.templateId);
    if (existing) {
      existing.push(slot);
    } else {
      byTemplate.set(slot.templateId, [slot]);
    }
  }

  return byTemplate;
}
