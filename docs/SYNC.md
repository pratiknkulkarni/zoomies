# Sync — Design Proposal

**Project:** Zoomies
**Document Type:** Proposal — **not authoritative, not scheduled, not built**
**Status:** Draft, August 2026. Written during Phase 11 at the request of the
owner, to be evaluated after v1 ships.
**Companion Documents:** `TECH_STACK.md` §11, `FEATURES.md` §14, `CLAUDE.md`

---

## 0. What this document is

A design for multi-device sync against a self-hosted PostgreSQL instance, so
that one person's training history is the same on two phones.

**Nothing here is in v1 and nothing here should be scaffolded, stubbed or
hooked for.** `CLAUDE.md`'s working style forbids placeholders for deferred
features, and this is the largest deferred feature there is. The document
exists so that the decision is made once, with the reasons written down, rather
than improvised the week it becomes urgent.

**It contradicts the current source-of-truth documents.** §9 lists exactly
which sentences have to be struck. None of that happens until v1 is out.

---

## 1. The requirement

> Everything keeps working as it does now. When I press **Sync**, this device
> reconciles with a remote Postgres instance. I can install the app on a second
> device, sign in, and get everything back. Training recorded on the second
> device shows up on the first after a sync. Both sides are playing catch-up.

That last sentence is correct as intuition and the whole design follows from
making it literally true.

---

## 2. The one correction: rows, not databases

**You cannot sync a database. You sync rows.**

The natural reading of "restore everything" and "catch up" is a snapshot —
device pushes its file up, or pulls the remote's file down. Both are wrong in
the same way, and it is worth being concrete about it:

> Monday, phone A logs a session and syncs. Tuesday, tablet B — which last
> synced Sunday — logs a session and syncs. If sync means *make the remote look
> like me*, Monday's session is gone. If it means *make me look like the
> remote*, Tuesday's is.

There is no ordering of whole-database operations that survives this. The only
thing that does is merging at the level of the individual row, which requires
three properties of every row: a **globally unique identity**, a **last-changed
stamp**, and a **representation of deletion that is itself a row**.

The schema already has all three, and not by accident.

---

## 3. Why this schema is unusually ready

Four decisions taken for other reasons turn out to be exactly what a sync needs.
They are listed here because they are the reason this is a phase of work and not
a rewrite.

**UUID v7 primary keys, generated on device.** Two phones offline for a week
cannot mint the same ID, and neither ever needs a server round-trip to create a
row. This was foreseen — `lib/ids.ts` already carries the comment *"they do not
collide across devices when sync arrives in v2."* An auto-increment integer key
would have made this project a data-migration exercise instead.

**`updated_at` on every user table**, epoch millis, maintained by
`$onUpdateFn` in `db/schema.ts`. The comparison key for conflict resolution
already exists on every row, with no back-fill.

**Soft delete only.** `deleted_at` means a deletion is an ordinary field change
on a row that still exists, so it replicates by the same mechanism as everything
else. Systems that hard-delete have to invent a tombstone table and then reason
about when it is safe to forget a tombstone. That problem does not arise here.

**Nothing aggregated is stored** (invariant 3). This is the one that matters
most and is the least obvious. If `24 reps` were a column, two devices could
agree on every underlying set and still disagree on the total — and nothing in
the data would say which was right. Because every total is a `SUM` at read time,
**agreement on rows is agreement, full stop.** There is no derived state to
reconcile, and therefore no class of bug where the numbers on two phones differ
while the training does not.

A fifth, from `FEATURES.md` §2.1: **targets are snapshotted onto
`exercise_entries`**, never read through the template slot. That rule exists so
editing a template cannot rewrite history — and it means a template edited on
one device cannot retroactively change what a session on the other device says
it was for. The invariant that protects history from *time* protects it from
*devices* too.

---

## 4. The conflict surface, and why it is nearly empty

**The data that must never be lost is the data that cannot conflict.**

- `sets`, `set_metric_values`, `exercise_entries`, `sessions` are created during
  a session, on one device, with unique IDs. Two devices never produce the same
  row. There is nothing to resolve — the merge is a union.
- Invariant 1 ("never lose a set") therefore survives sync **without any
  sync-specific handling at all.** This is worth stating plainly because it is
  the fear that makes people over-engineer sync.

A genuine conflict — the same row changed on both devices since the last sync —
is possible only in:

| Table | Realistic conflict |
|---|---|
| `exercises` | Renamed, activated or archived on both |
| `exercise_metrics` | Metric list edited on both |
| `templates`, `template_slots` | Target changed on both |
| `sets` (edited, not created) | A past set corrected on both |

All four are small, user-visible, and trivially repaired by editing again.

**Resolution: last write wins on `updated_at`, silently, with no UI.** A
conflict dialog asking one person which of their own two phones they meant is
worse than the conflict. Losing edits are written to a local log so they are
recoverable by inspection if it ever matters; nothing is shown on screen.

`TECH_STACK.md` §11 already proposed exactly this ("Last-write-wins on
`updated_at`. Completed sessions are immutable, so the conflict surface is
limited to exercise config and templates"), which this document confirms rather
than replaces.

---

## 5. The mechanism

### 5.1 Change detection uses a server sequence; conflict resolution uses the clock

These are two different jobs and conflating them is the classic way to lose
rows.

**Pulling** is driven by a **server-assigned monotonic sequence**, never a
timestamp. The client stores a cursor and asks for everything above it. Device
clock skew, a timezone change, or the user setting the clock back cannot cause a
row to be skipped, because no client clock is involved in deciding what to send.

**Resolving** a genuine conflict uses `updated_at`, which is a client clock and
therefore approximate. That is acceptable *only because* §4 established that the
conflict surface is four small tables of user-visible configuration. It would
not be acceptable for sets, and it never has to be.

### 5.2 Restore and catch-up are the same operation

The answer to *"should there be a full restore as well as a catch-up?"* is no:
**a restore is a catch-up with the cursor at zero.** A fresh install has synced
nothing, asks for everything above sequence 0, and receives the whole history.
There is no second code path, which means there is no second code path to be
wrong. This is the direct payoff of getting §5.1 right.

### 5.3 One sync, in order

```
1. push   — every locally-changed row since the last successful push
2. pull   — every remote row above the local cursor
3. apply  — merge into SQLite in one transaction; advance the cursor last
```

Push before pull, so that a conflict is resolved once, on the server, with both
versions present.

**The whole apply is a single SQLite transaction, and the cursor advances inside
it.** Advancing the cursor outside the transaction is the bug that loses data
silently: crash in between and the client believes it has rows it never wrote.
Replaying a batch, by contrast, is harmless — every write is an upsert by
primary key — so the safe failure is the one this ordering produces.

**`PRAGMA defer_foreign_keys = ON` for that transaction.** `db/client.ts:19`
turns foreign keys on, deliberately, for the cascades. A pulled batch will
routinely contain a `set` alongside the `exercise_entry` it points at, and
insisting on a valid graph after every statement would make the apply order
load-bearing. Deferring checks to commit keeps the batch order irrelevant while
still refusing to commit a broken graph.

### 5.4 Knowing what to push

Two options, and the obvious one is wrong.

**Rejected: `updated_at > last_push_watermark`.** It trusts the local clock, and
worse, it re-pushes every row that was just *pulled* — because applying a pulled
row updates it locally. Sync ping-pongs against itself forever.

**Chosen: a local-only `sync_pending(table_name, row_id)` table**, written in
the same transaction as every mutation and cleared on a successful push
acknowledgement. `CLAUDE.md` already mandates that every write goes through
`db/mutations/`, so there is exactly one layer to touch. Applying a pulled row
simply does not write to it, which kills the ping-pong by construction. It is
local-only, so it is never itself synced, and it adds no column to the nine
existing tables.

---

## 6. Three problems that will bite, in order of severity

### 6.1 The built-in catalogue duplicates itself

**This is the one that ruins a first sync if it is not handled.**

`db/seed.ts` calls `newId()` for each of the 41 built-in exercises on first
launch. Device B seeds its own catalogue with its own IDs. So B's *Pull-Up* and
A's *Pull-Up* are two different rows, and after the first sync there are two of
everything, with each device's history pointing at its own copy. A merge cannot
fix this afterwards, because by then real sets reference both.

**Fix: deterministic IDs for built-ins.** A fixed UUID per built-in exercise and
metric, baked into the seed catalogue, so both devices seed the *same identity*
and the merge is a no-op.

**Cost: one migration** that rewrites existing built-in IDs and every foreign
key pointing at them — `exercise_metrics.exercise_id`, `template_slots`
(`exercise_id`, `target_metric_id`), `exercise_entries` (`exercise_id`,
`target_metric_id`) and `set_metric_values.exercise_metric_id`. Mechanical, but
it has to be exactly right, and it is the reason invariant 6 exists.

**When: v2's first migration, not now.** There is no advantage to disturbing v1
— there is one device either way, so the migration is the same size whenever it
runs, and forward-only migrations are guaranteed to run on a device before its
first sync. Recorded here so that it is found in the design document rather than
in production.

**Rejected alternative:** matching built-ins by `(is_builtin, name)` at merge
time. A rename breaks it, and it puts product knowledge into the sync layer,
which is the layer that should know least.

### 6.2 `meta` must never sync

`meta` holds `seed.catalogue`, the flag that says the catalogue has been
planted. If it synced, a fresh device could receive that flag **before it ran
its own seed**, conclude the catalogue was already there, and start with zero
exercises. A table that looks like harmless key/value config is a total-failure
mode.

`appearance` is also arguably per-device — a phone in a dark gym and a tablet on
a desk need not agree — and the sync cursor and credentials will live in `meta`
too, which is a second and independent reason.

**Rule: `meta` is device-local and is excluded from the synced table set,
permanently.** Note that `lib/export.ts:exportedTableNames` discovers tables
from the schema by design; the sync list must be the *explicit* one, because
here the failure of an omission (a table silently not syncing) is milder than
the failure of an inclusion.

### 6.3 Schema version skew silently drops columns

Device A updates, gains a column, pushes rows containing it. Device B is on the
older build, pulls the row, does not know the column — and when B later edits
that row and pushes it back, A's column is gone. No error, no sign.

**Fix: every push carries the client's schema version**, the number
`db/queries/export.ts:schemaVersion()` already computes from
`__drizzle_migrations`. The server records the highest it has seen. **A client
whose local version is below that maximum refuses to sync** and says so: *this
backup is newer than this app — update it*. One guard, one comparison, a whole
class of silent loss removed. The export file already carries `schemaVersion`
for the same reason, so the concept is not new.

---

## 7. Where the server goes, and how dumb it should be

### 7.1 The phone cannot talk to Postgres

Two hard reasons, both fatal on their own:

- **No raw TCP sockets in React Native** without a native module, which means
  leaving the managed workflow — a one-way cost `TECH_STACK.md` §12 already
  refuses to pay.
- **Credentials in the client.** A Postgres password shipped inside an APK is a
  Postgres password published. Anyone who unzips the build has the database.

So a server is unavoidable. **"No backend" is the claim that actually dies
here** — not "no network calls", which survives in a weaker but still honest
form (§9).

The natural home is alongside the Gitea instance that already hosts this repo.
That is self-hosted infrastructure, which `TECH_STACK.md` §12 currently rules
out; given that the repository is already self-hosted, that ruling is the
inconsistent part, not the request.

### 7.2 Keep the server ignorant — the recommendation

This is the part of the design where there is a genuinely better answer than the
obvious one.

**Obvious: a typed mirror.** The same nine tables in `drizzle-orm/pg-core`.
Queryable server-side; could power a web client one day. But every schema change
must land in two places in lockstep, and client/server version skew becomes a
deployment problem on top of the data problem §6.3 already describes.

**Better: one opaque row store.**

```sql
create table rows (
  user_id     text   not null,
  table_name  text   not null,
  row_id      text   not null,
  payload     jsonb  not null,   -- the row, exactly as SQLite holds it
  updated_at  bigint not null,   -- client clock; LWW comparison key
  server_seq  bigint not null,   -- assigned here; the pull cursor
  schema_ver  int    not null,
  primary key (user_id, table_name, row_id)
);
create index rows_cursor_idx on rows (user_id, server_seq);
```

The server never learns what a set is. It stores opaque payloads, stamps them
with a sequence, and hands back everything above a cursor.

**The payoff: a schema change needs no server deploy.** For a personal,
self-hosted service the dominant long-run cost is not throughput or storage, it
is *having to touch the server at all* — a service that never needs redeploying
is a service that still works in two years when nobody remembers how it was set
up. It also keeps the client the only thing that understands training data,
which is what "local-first" is supposed to mean.

**Switch to the typed mirror if and only if a web client happens** — that is the
one requirement the opaque store genuinely cannot serve, and `FEATURES.md` §14
lists a web client as deferred, not planned.

### 7.3 `server_seq` has a trap in it

A `bigserial` is allocated when a row is inserted but becomes **visible** when
its transaction commits. Two concurrent pushes can therefore commit out of
order: sequence 5 lands before sequence 4. A client pulling at that instant sees
up to 5, sets its cursor to 5, and **never sees row 4.** A permanently lost row,
from code that looks obviously correct.

**Fix: `pg_advisory_xact_lock(user_id)` for the duration of each push
transaction**, serialising a single user's pushes so that sequence order and
commit order agree. For one person with two phones there is no throughput
consideration whatsoever, which makes the cheapest correct answer also the
right one.

### 7.4 Auth is device pairing, not accounts

`FEATURES.md` §15 cut accounts with the reason *"no second user."* **That reason
still holds.** There is no second user — there is a second *device*. The
distinction matters, because building account infrastructure for a population of
one is how a personal app grows a signup flow, a password reset, an email
provider and a support burden it never needed.

**Recommended: a single long passphrase**, typed once on the second device and
exchanged for a long-lived device token held in `expo-secure-store`. No signup,
no reset, no email, no third party. TLS is mandatory and already solved, since
the domain has certificates for Gitea.

**If there is ever a second human**, that is the moment email + password (or
Apple Sign In, which `TECH_STACK.md` §11 correctly notes becomes mandatory the
moment any third-party sign-in is offered) becomes worth its cost — and not
before.

---

## 8. What must remain true

**Sync is a leaf.** It reads and writes rows; nothing reads *through* it. If a
single screen ever waits on a network response, this design has failed and
should be reverted.

Concretely, all of these survive unchanged:

- SQLite remains the source of truth. Sync is a second opinion, never an
  authority.
- Every existing read and write path is untouched. No screen, query or mutation
  learns that sync exists.
- The app is complete and correct in airplane mode, forever. Sync failing is not
  an error state, it is Tuesday.
- The JSON export stays. It is the offline escape hatch and the thing that works
  when the server does not; a sync target you host yourself is not a substitute
  for a file you hold.
- Invariants 1–7 and 9 are untouched. Only invariant 8 changes (§9).

**One behavioural rule falls out of §4:** a session started on another device is
**not resumable** on this one. It replicates and appears in history, unfinished
and truthful, but the app does not offer to continue it — because two devices
appending sets to one session is the single path by which a real conflict on set
rows could occur, and refusing it costs nothing. This needs one bit of local
provenance ("did this device create this session"), which can live in a
local-only table rather than in the schema.

---

## 9. Documents that must be amended first

**No code before these.** `CLAUDE.md` requires that a conflict with a
source-of-truth document is raised rather than worked around, and this proposal
conflicts with four of them.

| Document | Currently says | Must become |
|---|---|---|
| `CLAUDE.md` invariant 8 | "**No network calls.** If a solution requires one, stop and flag it." | No network call is ever on a user's path. Sync is one button, on one screen, and the application is complete without it. |
| `CLAUDE.md` Out of Scope | "accounts, authentication, cloud sync" | Device pairing and self-hosted sync move to v2 scope. Accounts stay cut (§7.4). |
| `TECH_STACK.md` §11 | Auth and cloud database via Supabase | Self-hosted Postgres behind a small owned service. |
| `TECH_STACK.md` §12 | "No self-hosted infrastructure in this project"; "Self-hosted Postgres — not used" | Both reverse. The repository is already self-hosted. |
| `FEATURES.md` §14 | "Cloud sync, accounts, backup — `TECH_STACK.md` §11" | Sync moves from deferred to v2 scope; accounts stay in §15. |

---

## 10. Rough size

Not an afternoon. A phase.

**Client**

- `lib/sync.ts` — merge rules, LWW comparison, cursor arithmetic, the schema
  version guard. Pure, and therefore tested, exactly like `lib/export.ts`.
- `lib/sync.test.ts` — the conflict matrix, the empty-cursor restore, a batch
  containing a row and its parent, and a stale-client refusal.
- `db/queries/sync.ts`, `db/mutations/sync.ts` — read the pending set; apply a
  batch in one deferred-FK transaction.
- `sync_pending` table and a migration; sync keys in `meta`.
- One Settings row, and one line of status. Nothing else in the UI.
- The deterministic-ID migration of §6.1.

**Server**

- One table, one migration, two endpoints (`push`, `pull`), one advisory lock,
  one bearer token check. In the region of 300 lines.

**The tests worth writing are all on the client**, because the server is
deliberately too ignorant to have interesting bugs. That asymmetry is the point
of §7.2.

---

## 11. Open questions

Written down rather than resolved, because none of them blocks anything yet.

1. **How is the passphrase entered on the second device?** Typing forty
   characters on a phone is unpleasant; a QR code from device A is nicer and
   needs a camera permission that `FEATURES.md` currently has no reason to ask
   for.
2. **Does a failed sync retry automatically?** The instinct is no — one button,
   one attempt, one honest result. But a sync that fails while the phone is on a
   bad connection and is never retried is a backup that quietly is not one.
3. **Is `appearance` per-device or shared?** §6.2 assumes per-device, on the
   grounds that `meta` cannot sync anyway. If it should be shared, it needs to
   move out of `meta` first.
4. **Does the server ever purge?** Soft deletes accumulate forever on both
   sides. At one user's volume this is irrelevant for decades, which is a reason
   to leave it alone and a reason to say so out loud.
