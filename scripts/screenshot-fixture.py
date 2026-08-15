"""
Turns a finished history into one worth photographing, and reports the ids the
deep links need.

    python3 scripts/screenshot-fixture.py <db> <ids-file>

Two jobs `dummy-data.py` has no reason to do.

**One session is left in progress.** The live session screen is the screen the
whole application exists for, and it cannot be photographed at all without an
incomplete session. `dummy-data.py` completes every session it writes, which is
correct — a smoke test of the charts wants finished history.

**The clock is the phone's, not the file's.** The generated history ends
whenever it ends, and anchoring the live session to the newest row in the file
makes the session timer read the distance between that row and now. It read
1580:26 the first time.
"""

import sqlite3
import sys
import time

MINUTES_IN = 24 * 60 * 1000

LATEST_SESSION = """
    SELECT id, started_at FROM sessions
    WHERE is_quick_log = 0 AND completed_at IS NOT NULL AND deleted_at IS NULL
    ORDER BY started_at DESC LIMIT 1
"""

# The exercise with the most sets behind it: the one whose records and trend
# have something to show.
BUSIEST_EXERCISE = """
    SELECT e.id FROM exercises e
    JOIN exercise_entries en ON en.exercise_id = e.id
    JOIN sets s ON s.exercise_entry_id = en.id
    WHERE e.deleted_at IS NULL
    GROUP BY e.id ORDER BY COUNT(s.id) DESC LIMIT 1
"""


def main() -> None:
    db, out = sys.argv[1], sys.argv[2]
    con = sqlite3.connect(db)
    con.execute("PRAGMA foreign_keys = OFF")

    live_id, started = con.execute(LATEST_SESSION).fetchone()
    shift = (int(time.time() * 1000) - MINUTES_IN) - started

    con.execute(
        "UPDATE sessions SET started_at = ?, completed_at = NULL WHERE id = ?",
        (started + shift, live_id),
    )
    con.execute(
        """UPDATE sets SET performed_at = performed_at + ?
           WHERE exercise_entry_id IN
             (SELECT id FROM exercise_entries WHERE session_id = ?)""",
        (shift, live_id),
    )

    # A session mid-flight rather than one that has quietly finished: drop the
    # sets of the last two exercises so there is something left to do.
    entries = con.execute(
        """SELECT id FROM exercise_entries WHERE session_id = ?
           ORDER BY display_order DESC LIMIT 2""",
        (live_id,),
    ).fetchall()
    for (entry,) in entries:
        con.execute(
            """DELETE FROM set_metric_values WHERE set_id IN
               (SELECT id FROM sets WHERE exercise_entry_id = ?)""",
            (entry,),
        )
        con.execute("DELETE FROM sets WHERE exercise_entry_id = ?", (entry,))

    # The one before it, now the most recent completed one, for the read-back.
    history_id = con.execute(LATEST_SESSION).fetchone()[0]
    exercise_id = con.execute(BUSIEST_EXERCISE).fetchone()[0]

    con.commit()
    con.close()

    with open(out, "w", encoding="utf-8") as handle:
        handle.write("LIVE_SESSION=%s\n" % live_id)
        handle.write("HISTORY_SESSION=%s\n" % history_id)
        handle.write("EXERCISE=%s\n" % exercise_id)


if __name__ == "__main__":
    main()
