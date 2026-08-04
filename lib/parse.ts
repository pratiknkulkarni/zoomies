/**
 * Turning what was typed into what is stored. The inverse of `format.ts`, and
 * the place invariant 2 is enforced at the edge:
 *
 *   **Null means not recorded. Zero means zero.**
 *
 * An empty field is null — the user said nothing. `0` is null's opposite: a
 * recorded value that happens to be zero. Neither of these functions may ever
 * turn one into the other.
 */

/** Shared by both parsers: empty means not recorded. */
function trimmed(text: string): string | null {
  const value = text.trim();
  return value.length > 0 ? value : null;
}

/**
 * A whole number, for counts and seconds.
 *
 * Anything unparseable reads as not recorded rather than as a guess. The
 * fields using this are numeric-keyboard, so that case is a stray character
 * rather than a sentence.
 */
export function toNullableInt(text: string): number | null {
  const value = trimmed(text);
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.trunc(parsed);
}

/** A measurement, which may be fractional — 2.5 kg is a real load. */
export function toNullableFloat(text: string): number | null {
  const value = trimmed(text);
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** What a nullable number puts back in a field. Null is an empty field. */
export function fromNullableNumber(value: number | null): string {
  return value === null ? '' : String(value);
}
