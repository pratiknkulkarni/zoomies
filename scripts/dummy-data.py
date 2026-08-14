"""
Builds a `zoomies.db` holding a long, plausible training history.

    python3 scripts/dummy-data.py --weeks 40 --out /tmp/zoomies.db

**This exists because `SMOKE_TEST.md` section AD cannot be run without it.**
Every scroll check in that section is invisible on a young database — the chart
content is narrower than its own viewport, nothing moves, and each check passes
for the wrong reason. Thirteen weeks is the floor at which the charts begin to
scroll at all, so the default here is comfortably past it.

It writes a **complete database**, not a patch: the migrations are applied from
`db/migrations`, `__drizzle_migrations` is filled in so the application does not
re-run them, and the built-in catalogue is planted with the seed flag set so
`seedIfNeeded` leaves it alone. The catalogue is read out of `db/seed.ts` rather
than transcribed, for the same reason `icons.py` reads `global.css`: a second
copy of a list is a list that will eventually disagree.

Nothing here imports from the application. It is a fixture generator, and the
only contract it holds is the schema.
"""

import argparse
import json
import os
import random
import re
import secrets
import sqlite3
import uuid
from datetime import datetime, timedelta

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED_KEY = "seed.catalogue"
SEED_VERSION = "1"


# ---------------------------------------------------------------------------
# Identity and time
# ---------------------------------------------------------------------------


def uuid7(ms: int) -> str:
    """
    UUID v7, matching `lib/ids.ts`.

    The timestamp prefix is what makes ids sort chronologically, and several
    reads lean on it — `recentRecords` and `personalRecords` both break ties by
    comparing ids, on the stated grounds that the smaller one is the older one.
    A v4 here would make those tiebreaks random.
    """
    ts = ms & ((1 << 48) - 1)
    return str(
        uuid.UUID(
            int=(ts << 80)
            | (0x7 << 76)
            | (secrets.randbits(12) << 64)
            | (0b10 << 62)
            | secrets.randbits(62)
        )
    )


def at(day: datetime, hour: int, minute: int = 0) -> int:
    """Epoch millis in the local zone, which is what the application stores."""
    moment = day.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return int(moment.timestamp() * 1000)


# ---------------------------------------------------------------------------
# The catalogue, read rather than copied
# ---------------------------------------------------------------------------


def catalogue() -> list[dict]:
    """
    `db/seed.ts`'s `CATALOGUE`, parsed.

    Importing it is not possible — `seed.ts` imports `./client`, which imports
    `expo-sqlite`, which does not load outside the app. The literal is uniform,
    so it is read with a regex and then checked: if that file changes shape the
    assertions fail loudly, rather than a thin catalogue passing for a full one.
    """
    source = open(os.path.join(REPO, "db", "seed.ts")).read()

    metrics = {}
    for name in re.findall(r"const ([A-Z_]+): SeedMetric", source):
        found = re.search(
            rf"const {name}: SeedMetric = {{\s*name: '(?P<n>[^']+)',\s*"
            rf"type: '(?P<t>[^']+)',\s*unit: (?P<u>null|'[^']*'),?\s*}}",
            source,
        )
        if found:
            metrics[name] = {
                "name": found.group("n"),
                "type": found.group("t"),
                "unit": None if found.group("u") == "null" else found.group("u").strip("'"),
            }

    block = source[source.index("const CATALOGUE") :]
    block = block[: block.index("\n];")]

    parsed = []
    for entry in re.finditer(
        r"name:\s*'(?P<name>[^']+)',\s*"
        r"family:\s*'(?P<family>[^']+)',\s*"
        r"isActive:\s*(?P<active>true|false),\s*"
        r"metrics:\s*\[(?P<metrics>[^\]]*)\]",
        block,
    ):
        names = [m.strip() for m in entry.group("metrics").split(",") if m.strip()]
        parsed.append(
            {
                "name": entry.group("name"),
                "family": entry.group("family"),
                "is_active": entry.group("active") == "true",
                "metrics": [metrics[n] for n in names if n in metrics],
            }
        )

    assert metrics, "no SeedMetric constants found — db/seed.ts changed shape"
    assert len(parsed) > 20, f"only parsed {len(parsed)} exercises from db/seed.ts"
    assert all(e["metrics"] for e in parsed), "an exercise parsed with no metrics"
    return parsed


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------


def build_schema(con: sqlite3.Connection) -> None:
    """Apply every migration, then claim them so the app does not re-run them."""
    journal = json.load(
        open(os.path.join(REPO, "db", "migrations", "meta", "_journal.json"))
    )

    for entry in journal["entries"]:
        sql = open(os.path.join(REPO, "db", "migrations", f"{entry['tag']}.sql")).read()
        for statement in sql.split("--> statement-breakpoint"):
            if statement.strip():
                con.execute(statement)

    # `drizzle-orm/expo-sqlite/migrator` sets every hash to the empty string and
    # decides what to run by comparing `created_at` against the journal's
    # `when`. The empty hashes below are not a shortcut — they are exactly what
    # the application itself writes.
    con.execute(
        "CREATE TABLE IF NOT EXISTS __drizzle_migrations "
        "(id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)"
    )
    con.executemany(
        "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
        [("", entry["when"]) for entry in journal["entries"]],
    )


# ---------------------------------------------------------------------------
# Rows
# ---------------------------------------------------------------------------

LIFECYCLE = "created_at, updated_at, deleted_at"


class Writer:
    """Insert helpers that keep the lifecycle columns honest."""

    def __init__(self, con: sqlite3.Connection):
        self.con = con
        self.counts: dict[str, int] = {}

    def insert(self, table: str, row: dict) -> None:
        columns = ", ".join(row)
        marks = ", ".join("?" for _ in row)
        self.con.execute(
            f"INSERT INTO {table} ({columns}) VALUES ({marks})", list(row.values())
        )
        self.counts[table] = self.counts.get(table, 0) + 1


def plant_catalogue(w: Writer, now: int) -> dict[str, dict]:
    """
    The built-in catalogue, and the flag that stops the app planting it again.

    Returns the exercises by name, each with its metric ids, so the history
    below can point at them.
    """
    by_name: dict[str, dict] = {}
    stamp = now - 240 * 86_400_000

    for index, entry in enumerate(catalogue()):
        exercise_id = uuid7(stamp + index)
        w.insert(
            "exercises",
            {
                "id": exercise_id,
                "name": entry["name"],
                "family": entry["family"],
                "notes": None,
                "is_builtin": 1,
                "is_active": 1 if entry["is_active"] else 0,
                "is_archived": 0,
                "suggestion_dismissed_at": None,
                "created_at": stamp,
                "updated_at": stamp,
                "deleted_at": None,
            },
        )

        metric_ids = {}
        for order, metric in enumerate(entry["metrics"]):
            metric_id = uuid7(stamp + index * 10 + order)
            w.insert(
                "exercise_metrics",
                {
                    "id": metric_id,
                    "exercise_id": exercise_id,
                    "name": metric["name"],
                    "type": metric["type"],
                    "unit": metric["unit"],
                    "display_order": order,
                    "created_at": stamp,
                    "updated_at": stamp,
                    "deleted_at": None,
                },
            )
            metric_ids[metric["name"]] = {"id": metric_id, **metric}

        by_name[entry["name"]] = {
            "id": exercise_id,
            "metrics": metric_ids,
            "is_active": entry["is_active"],
        }

    w.insert("meta", {"key": SEED_KEY, "value": SEED_VERSION, "updated_at": stamp})
    return by_name


def add_two_metric_exercise(w: Writer, now: int, by_name: dict[str, dict]) -> dict:
    """
    One exercise measuring two things that rank.

    Nothing in the seeded catalogue does — every entry is reps *or* a hold — so
    without this there is no way to see the trend's metric picker at all, and
    smoke check AD9 has nothing to run against.
    """
    stamp = now - 239 * 86_400_000
    exercise_id = uuid7(stamp)
    w.insert(
        "exercises",
        {
            "id": exercise_id,
            "name": "Ring Muscle-Up",
            "family": "Pull-up",
            "notes": "Two rankable metrics, so the trend offers a choice.",
            "is_builtin": 0,
            "is_active": 1,
            "is_archived": 0,
            "suggestion_dismissed_at": None,
            "created_at": stamp,
            "updated_at": stamp,
            "deleted_at": None,
        },
    )

    metrics = {}
    for order, metric in enumerate(
        [
            {"name": "Reps", "type": "number", "unit": None},
            {"name": "Hold", "type": "duration", "unit": "s"},
            {"name": "Notes", "type": "notes", "unit": None},
        ]
    ):
        metric_id = uuid7(stamp + order)
        w.insert(
            "exercise_metrics",
            {
                "id": metric_id,
                "exercise_id": exercise_id,
                "name": metric["name"],
                "type": metric["type"],
                "unit": metric["unit"],
                "display_order": order,
                "created_at": stamp,
                "updated_at": stamp,
                "deleted_at": None,
            },
        )
        metrics[metric["name"]] = {"id": metric_id, **metric}

    entry = {"id": exercise_id, "metrics": metrics, "is_active": True}
    by_name["Ring Muscle-Up"] = entry
    return entry


# ---------------------------------------------------------------------------
# History
# ---------------------------------------------------------------------------

NOTES = [
    "Felt strong.",
    "Grip went first.",
    "Slow and controlled.",
    "Tired, kept it short.",
    "Shoulders warm today.",
    None,
    None,
    None,
]


def plan(by_name: dict[str, dict]) -> list[dict]:
    """
    Which movements appear, how they progress, and where the gaps are.

    `start` and `gain` are reps or seconds at week zero and per week. The
    numbers are deliberately slow — a trend that doubles in nine months is not
    what the chart has to render legibly.
    """
    wanted = [
        ("Pull-Up", "Reps", 5, 0.16, 1.4, None),
        ("Chin-Up", "Reps", 6, 0.15, 1.4, None),
        ("Ring Row", "Reps", 9, 0.20, 1.6, None),
        ("Push-Up", "Reps", 14, 0.34, 2.2, None),
        ("Dip", "Reps", 5, 0.17, 1.3, None),
        ("Ring Support Hold", "Hold", 18, 0.9, 4.0, None),
        ("L-Sit", "Hold", 8, 0.55, 2.4, None),
        ("Handstand", "Hold", 11, 0.7, 4.5, None),
        # A deliberate three-week silence in the middle, for AD12: the dots
        # either side must sit three times as far apart as two consecutive
        # weeks, with nothing joining them.
        ("Pistol Squat", "Reps", 4, 0.13, 1.2, (17, 20)),
        ("Hanging Leg Raise", "Reps", 7, 0.18, 1.5, None),
        ("Ring Muscle-Up", "Reps", 1, 0.05, 0.6, None),
    ]

    return [
        {
            "exercise": by_name[name],
            "name": name,
            "metric": by_name[name]["metrics"][metric],
            "start": start,
            "gain": gain,
            "noise": noise,
            "gap": gap,
        }
        for name, metric, start, gain, noise, gap in wanted
        if name in by_name and metric in by_name[name]["metrics"]
    ]


def generate(w: Writer, weeks: int, now_day: datetime, rng: random.Random,
             by_name: dict[str, dict]) -> None:
    movements = plan(by_name)
    assert movements, "no planned movement matched the catalogue"

    # A template, so sessions carry a name and the raise prompt has somewhere to
    # point. Two of them, because history that all looks the same tells you less.
    template_defs = [
        ("Push", ["Push-Up", "Dip", "Handstand", "L-Sit"]),
        ("Pull", ["Pull-Up", "Chin-Up", "Ring Row", "Hanging Leg Raise"]),
        ("Rings", ["Ring Muscle-Up", "Ring Support Hold", "Pistol Squat"]),
    ]

    stamp = int(now_day.timestamp() * 1000) - 238 * 86_400_000
    templates = []

    for order, (name, members) in enumerate(template_defs):
        template_id = uuid7(stamp + order)
        w.insert(
            "templates",
            {
                "id": template_id,
                "name": name,
                "display_order": order,
                "created_at": stamp,
                "updated_at": stamp,
                "deleted_at": None,
            },
        )

        slots = []
        for slot_order, member in enumerate(m for m in members if m in by_name):
            movement = next((m for m in movements if m["name"] == member), None)
            if movement is None:
                continue
            slot_id = uuid7(stamp + order * 10 + slot_order)
            target = round(movement["start"] + movement["gain"] * weeks * 0.6)
            w.insert(
                "template_slots",
                {
                    "id": slot_id,
                    "template_id": template_id,
                    "exercise_id": movement["exercise"]["id"],
                    "display_order": slot_order,
                    "target_sets": 4,
                    "target_metric_id": movement["metric"]["id"],
                    "target_value": target,
                    "created_at": stamp,
                    "updated_at": stamp,
                    "deleted_at": None,
                },
            )
            slots.append({"id": slot_id, "movement": movement, "target": target})

        templates.append({"id": template_id, "name": name, "slots": slots})

    monday = now_day - timedelta(days=now_day.weekday()) - timedelta(weeks=weeks - 1)

    for week in range(weeks):
        # Two weeks off somewhere in the middle, so the grid has real holes in it
        # rather than a uniform stripe.
        if week in (11, 12):
            continue

        for slot, (offset, hour) in enumerate([(0, 7), (2, 18), (4, 7), (5, 9)]):
            # Three or four sessions a week, not always the same days.
            if slot == 3 and rng.random() < 0.55:
                continue

            day = monday + timedelta(weeks=week, days=offset)
            if day.date() > now_day.date():
                continue

            template = templates[(week * 4 + slot) % len(templates)]
            started = at(day, hour)
            members = [
                s
                for s in template["slots"]
                if not (
                    s["movement"]["gap"]
                    and s["movement"]["gap"][0] <= week < s["movement"]["gap"][1]
                )
            ]
            if not members:
                continue

            session_id = uuid7(started)
            completed = started + rng.randint(45, 105) * 60_000
            w.insert(
                "sessions",
                {
                    "id": session_id,
                    "template_id": template["id"],
                    "name": template["name"],
                    "started_at": started,
                    "completed_at": completed,
                    "paused_at": None,
                    "accumulated_pause_ms": 0,
                    "is_quick_log": 0,
                    "notes": rng.choice(NOTES),
                    "created_at": started,
                    "updated_at": completed,
                    "deleted_at": None,
                },
            )

            for order, member in enumerate(members):
                write_entry(
                    w, rng, session_id, member["movement"], week, started, order,
                    slot_id=member["id"], target=member["target"],
                )

        # A doorway set now and then. §11.5 keeps these out of the sessions
        # figure while still counting toward sets and records, which is a rule
        # worth being able to see rather than only read.
        if rng.random() < 0.3:
            day = monday + timedelta(weeks=week, days=rng.choice([1, 3, 6]))
            if day.date() <= now_day.date():
                movement = rng.choice([m for m in movements if m["metric"]["type"] == "number"])
                started = at(day, 21)
                session_id = uuid7(started)
                w.insert(
                    "sessions",
                    {
                        "id": session_id,
                        "template_id": None,
                        "name": None,
                        "started_at": started,
                        "completed_at": started + 240_000,
                        "paused_at": None,
                        "accumulated_pause_ms": 0,
                        "is_quick_log": 1,
                        "notes": None,
                        "created_at": started,
                        "updated_at": started,
                        "deleted_at": None,
                    },
                )
                write_entry(w, rng, session_id, movement, week, started, 0, sets=1)


def write_entry(w: Writer, rng: random.Random, session_id: str, movement: dict,
                week: int, started: int, order: int, slot_id: str | None = None,
                target: int | None = None, sets: int | None = None) -> None:
    """One exercise inside one session, with its sets and their measurements."""
    entry_id = uuid7(started + order * 1000)
    w.insert(
        "exercise_entries",
        {
            "id": entry_id,
            "session_id": session_id,
            "exercise_id": movement["exercise"]["id"],
            "display_order": order,
            "target_sets": 4 if target is not None else None,
            "target_metric_id": movement["metric"]["id"] if target is not None else None,
            "target_value": target,
            "notes": None,
            "is_ad_hoc": 0,
            "created_at": started,
            "updated_at": started,
            "deleted_at": None,
            "template_slot_id": slot_id,
        },
    )

    count = sets if sets is not None else rng.randint(3, 5)
    # The trend plots the best set of a session, so the sets have to fall off
    # across a session the way real ones do — otherwise every session's best is
    # its last and the chart is smoother than training is.
    peak = movement["start"] + movement["gain"] * week

    for index in range(count):
        fatigue = index * (peak * 0.06)
        value = peak - fatigue + rng.gauss(0, movement["noise"])
        value = max(1, round(value))

        performed = started + order * 600_000 + index * 150_000
        set_id = uuid7(performed)
        w.insert(
            "sets",
            {
                "id": set_id,
                "exercise_entry_id": entry_id,
                "set_index": index,
                "to_failure": 1 if index == count - 1 and rng.random() < 0.35 else 0,
                "performed_at": performed,
                "created_at": performed,
                "updated_at": performed,
                "deleted_at": None,
            },
        )
        w.insert(
            "set_metric_values",
            {
                "id": uuid7(performed + 1),
                "set_id": set_id,
                "exercise_metric_id": movement["metric"]["id"],
                "value_num": value,
                "value_text": None,
                "created_at": performed,
                "updated_at": performed,
                "deleted_at": None,
            },
        )

        # A second metric where the exercise has one, so the picker has data on
        # both sides of it — and one unrecorded on purpose, because invariant 2
        # is the thing most worth being able to see on a screen.
        others = [
            m
            for m in movement["exercise"]["metrics"].values()
            if m["id"] != movement["metric"]["id"]
        ]
        for other in others:
            if other["type"] == "notes":
                note = rng.choice(NOTES)
                if note:
                    w.insert(
                        "set_metric_values",
                        {
                            "id": uuid7(performed + 2),
                            "set_id": set_id,
                            "exercise_metric_id": other["id"],
                            "value_num": None,
                            "value_text": note,
                            "created_at": performed,
                            "updated_at": performed,
                            "deleted_at": None,
                        },
                    )
                continue

            recorded = rng.random() > 0.15
            w.insert(
                "set_metric_values",
                {
                    "id": uuid7(performed + 3),
                    "set_id": set_id,
                    "exercise_metric_id": other["id"],
                    "value_num": max(1, round(4 + week * 0.25 + rng.gauss(0, 1.5)))
                    if recorded
                    else None,
                    "value_text": None,
                    "created_at": performed,
                    "updated_at": performed,
                    "deleted_at": None,
                },
            )


# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--weeks", type=int, default=40,
                        help="weeks of history (13 is where the charts start to scroll)")
    parser.add_argument("--out", default="/tmp/zoomies.db")
    parser.add_argument("--seed", type=int, default=7, help="rng seed, for a repeatable file")
    args = parser.parse_args()

    if args.out != ":memory:" and os.path.exists(args.out):
        os.remove(args.out)

    rng = random.Random(args.seed)
    now_day = datetime.now()
    now = int(now_day.timestamp() * 1000)

    con = sqlite3.connect(args.out)
    con.execute("PRAGMA foreign_keys = ON")
    build_schema(con)

    w = Writer(con)
    by_name = plant_catalogue(w, now)
    add_two_metric_exercise(w, now, by_name)
    generate(w, args.weeks, now_day, rng, by_name)

    con.commit()

    span = con.execute(
        "SELECT MIN(performed_at), MAX(performed_at), COUNT(*) FROM sets"
    ).fetchone()
    days = (span[1] - span[0]) / 86_400_000
    print(f"wrote {args.out}")
    for table in sorted(w.counts):
        print(f"  {w.counts[table]:>6}  {table}")
    print(f"\n  {days:.0f} days of history ({days / 7:.0f} weeks), {span[2]} sets")
    con.close()


if __name__ == "__main__":
    main()
