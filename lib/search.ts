/**
 * Substring matching, case-insensitive, for the search fields on the template
 * exercise picker and inside the picker sheet.
 *
 * **Deliberately not fuzzy.** `pull` should find `Pull-Up` and
 * `One-Arm Pull-Up` and nothing else; at a catalogue of a few dozen entries,
 * anything cleverer only introduces surprises about why something matched.
 *
 * Shared so the two screens agree on what matching means, rather than each
 * writing its own `.toLowerCase().includes()` and drifting.
 */
export function matchesQuery(text: string, query: string): boolean {
  const needle = query.trim().toLowerCase();

  // An empty query matches everything — the list is unfiltered, not empty.
  if (needle.length === 0) {
    return true;
  }

  return text.toLowerCase().includes(needle);
}
