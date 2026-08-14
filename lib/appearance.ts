/**
 * The one local preference (FEATURES.md §13, TECH_STACK.md §5.1).
 *
 * Pure, and separate from the row it is stored in for the reason every other
 * `lib/` module is: `db/` imports the client and the runner cannot open it. The
 * thing worth being wrong about here is not the read — it is what happens when
 * the stored value is not one of the three.
 */

/** What the user chose, not what the phone is currently showing. */
export const APPEARANCES = ['system', 'light', 'dark'] as const;

export type Appearance = (typeof APPEARANCES)[number];

/** The key in `meta`. Stated once so the read and the write cannot drift. */
export const APPEARANCE_KEY = 'appearance';

/**
 * Follow the system unless told otherwise.
 *
 * This is also what an unreadable or unrecognised stored value falls back to,
 * and it is the only safe choice: the system setting is by definition what the
 * user already gets everywhere else.
 */
export const DEFAULT_APPEARANCE: Appearance = 'system';

/**
 * What a stored string means.
 *
 * **Anything unrecognised is the default, never a throw.** A preference is not
 * training history: a row this cannot parse — hand-edited, written by a later
 * version, corrupted — must cost a theme, not a launch. `app/_layout.tsx` reads
 * this before the first frame, so a throw here is a blank screen.
 */
export function parseAppearance(value: string | null | undefined): Appearance {
  return APPEARANCES.find((option) => option === value) ?? DEFAULT_APPEARANCE;
}

/** How each option is offered. Sentence case, per `DESIGN.md` §2.5. */
export const APPEARANCE_LABELS: Record<Appearance, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

/**
 * What choosing it does, on the line beneath.
 *
 * `System` is the only one that needs explaining — the other two say what they
 * do by being the word for it.
 */
export const APPEARANCE_CAPTIONS: Record<Appearance, string | null> = {
  system: 'Follows your phone, and changes with it.',
  light: null,
  dark: null,
};
