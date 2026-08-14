# Technology Stack

**Project:** Zoomies
**Document Type:** Technical Source of Truth
**Status:** Authoritative — supersedes all prior stack decisions
**Last Updated:** August 2026
**Companion Documents:** `FEATURES.md`, `DESIGN.md`

---

## 0. Status of This Document

This document is the **single source of truth for technology decisions**.

It supersedes the technology sections of:

- `requirements_one.md` (TENSION PRD) — §5 *Technical Architecture Strategy*
- `fitness_app_readme.md` — *Technology Stack*, *Publishing Strategy*
- `reuirements_two.md` (Design Notes) — §31 *Architecture Principles*

Where those documents conflict with this one, **this document wins**.

Where those documents describe *product* and *features*, see `FEATURES.md`.

### Superseded Decisions

| Source | Prior decision | Current decision |
|---|---|---|
| `requirements_one.md` §5 | Go (Golang) API backend | No backend in v1 |
| `requirements_one.md` §5 | Server-side PostgreSQL | Local SQLite on device |
| `fitness_app_readme.md` | Supabase as primary datastore | Deferred to v2; local-first in v1 |
| `fitness_app_readme.md` | Supabase Auth in v1 | No auth in v1 |
| `fitness_app_readme.md` | Firebase Analytics + Sentry in v1 | Deferred |
| `reuirements_two.md` §31.3 | Server provides auth/backup/sync | Deferred to v2 |

### Retained Principles

Carried forward from the design notes as technical constraints:

- **§31.1** — Offline is the primary mode.
- **§31.2** — The local database is authoritative. The cloud is never in the
  critical path during training.
- **§31.4** — Store source data only. Progress, Highlights and Trends are derived.
- **§31.7** — Migrations prioritise preservation. Users keep years of history.
- **§31.8** — Performance is a feature.
- **§31.9** — Never lose data. Never duplicate data. Never require internet
  during training.

---

## 1. Guiding Principle

> Hosted services over self-hosted infrastructure.
> Local-first over cloud-first.
> No operational surface area in v1.

There is no Docker, no Compose file, no VPS, no reverse proxy, and no server to
keep alive. The application is a mobile binary with a database file inside it.

---

## 2. Platform

**React Native via Expo — managed workflow.**
**Expo SDK 57** (React Native 0.86, React 19.2). Pinned; upgrade deliberately.

Target: **iOS and Android**, single codebase.

| Reason | Detail |
|---|---|
| Store distribution | The product must ship to the App Store. A PWA cannot. |
| No Mac required | EAS Build compiles iOS binaries in the cloud. |
| OTA updates | `expo-updates` ships JS-only fixes without a store review cycle. |
| Ecosystem | Native modules for haptics, notifications, SQLite, keep-awake. |
| Transferable skill | Existing React and TypeScript knowledge applies directly. |

Platform-specific code is introduced only where unavoidable.

**Explicitly rejected:** Flutter (new language, no existing leverage), native
Swift/Kotlin (two codebases), PWA (no App Store path, weaker background timers
and haptics).

### 2.1 Web

Web is **not a v1 target**, but the component layer is chosen so a web client
remains possible without a rewrite (see §6.3). If a web surface ships later it
is a read-only dashboard, not a second logging client.

---

## 3. Language

**TypeScript**, strict mode.

- `strict: true`, `noUncheckedIndexedAccess: true`
- No `any` in domain or persistence code
- Types are inferred from the Drizzle schema, never hand-written alongside it

---

## 4. Data Layer

### 4.1 Database

**SQLite on device, via `expo-sqlite`.**

This is the source of truth. Not a cache. Not a mirror.

Rationale: §31.2 of the design notes requires that every user interaction
complete using only the local database. A local SQLite file is the direct
expression of that, not an approximation.

### 4.2 ORM

**Drizzle ORM**, with the `expo-sqlite` driver.

| Reason | Detail |
|---|---|
| Type safety | Schema is the single definition; types are inferred from it. |
| Migrations | `drizzle-kit` generates SQL migrations, bundled and run on app start. |
| Reactivity | `useLiveQuery` re-renders components on write — no separate cache layer. |
| Continuity | Already in use on other personal projects. |
| Portability | The same schema definitions migrate to Postgres in v2. |

### 4.3 Schema Rules

Non-negotiable. These exist so v2 sync is possible without a data migration.

- Every table has a **UUID v7** primary key, generated on device via the
  `uuidv7` package. **Not** `crypto.randomUUID()`, which produces v4.
  Auto-increment integers are never used — they collide across devices.
- Every table has `created_at` and `updated_at` as integer epoch milliseconds.
- Every user-owned table has a nullable `deleted_at` (soft delete).
- No derived values are persisted.
- Completed sessions are treated as immutable history.

### 4.4 Migrations

`drizzle-kit generate` produces SQL files bundled with the app and applied
automatically on launch. Forward-only. A migration that could lose training
history is not shipped.

### 4.5 Seeding

**First-launch seed, not a migration.** An idempotent seed guarded by a flag row
in a `meta` table. That table is the general key/value store; §5.1 puts the
appearance preference in it too.

Rationale: adding a built-in exercise later must not require a schema migration,
and a user-deleted built-in must not reappear on the next migration run. Runs
once; never touches user data afterwards.

### 4.6 Units

**Kilograms.** Load is recorded as **added load** — weight added to bodyweight,
not absolute. Durations are stored in seconds as integers.

---

## 5. State Management

| Concern | Tool |
|---|---|
| Persisted domain data | Drizzle `useLiveQuery` reading SQLite directly |
| Active session ephemeral state | **Zustand** |
| Local preferences | The `meta` table — see §5.1. No AsyncStorage, no `expo-secure-store`. |
| Server state | None in v1 |

No TanStack Query, no Redux, no normalised client cache. The database is local
and fast enough that a caching layer would add indirection without benefit.

### 5.1 Preferences live in `meta`

There is exactly one local preference — the appearance override (`FEATURES.md`
§13) — and it is one row in the key/value table §4.5 already created for the
seed flag.

**AsyncStorage was listed here and is not installed.** Its one advantage over a
SQLite read is being available before the database opens, and this application
does not have that window: `app/_layout.tsx` holds the splash screen until
migrations and the seed resolve, so the first frame already renders after a
database is open. A second persistence mechanism, for one enum, that has to be
kept in step with a source of truth §4.1 says is the database, buys a dependency
and a way for the two to disagree.

`expo-secure-store` is for secrets. There are none — no accounts, no tokens, no
network.

Zustand holds only what does not belong in the database: current exercise index,
timer running state, unsaved set draft.

---

## 6. UI

### 6.1 Navigation

**Expo Router** — file-based routing, typed routes enabled.

### 6.2 Styling

**NativeWind v4** — Tailwind semantics on React Native primitives.

Design tokens live in `tailwind.config.js` and `global.css` as CSS variables.
That is the only place colours and spacing are defined. No hardcoded hex values
in components.

### 6.3 Component Layer

**react-native-reusables** — `reactnativereusables.com`

shadcn/ui's philosophy ported to React Native. Chosen over both a hand-built
primitive set and a conventional component library.

| Reason | Detail |
|---|---|
| Ownership | Copy-paste into the repo, not an npm dependency. Components are edited freely — the same model as shadcn/ui. |
| Universal | `@rn-primitives` on native, `radix-ui` on web. The same component code targets both, which keeps a future web client viable. |
| Styling match | Built on NativeWind v4, already the styling layer. |
| Theming | Ships CSS-variable-based light/dark theming out of the box. |
| Accessibility | Accessible primitives by default. |
| Familiarity | Same component names and API shape as shadcn/ui. |

**Rejected alternatives:**

- **shadcn/ui directly** — web-only. Built on Radix and React DOM; the
  primitives do not exist on native.
- **Tamagui** — faster, but its own compiler and styling system, which would
  displace NativeWind and add build complexity.
- **gluestack** — universal, but heavier and more opinionated than needed here.
- **Hand-built primitives** — full control, but reimplements accessible sheets,
  dialogs and selects for no gain.

Because components are copied into the repo rather than imported, the visual
identity is not constrained by the library's defaults. They are a starting
point, not a design system.

Where a genuinely hard primitive is needed beyond the library:

- `@gorhom/bottom-sheet` — bottom sheets
- `react-native-gesture-handler` + `react-native-reanimated` — gestures, animation

**No charting library, and there will not be one.** Both charts in the
application — §11.3's days-trained grid and §10.2's best-set trend — are built
from `View`s. `DESIGN.md` §7 forbids axes, gridlines, tooltips, gestures and
animation, which is every feature such a library sells, so `victory-native` and
its `@shopify/react-native-skia` requirement would have installed three packages
to position forty views. `react-native-svg` arrives as a peer of the icons and
is deliberately never imported from a screen. `PLAN.md` §4.4 has the history.

### 6.4 Visual Design

**Direction: quiet editorial.** Near-monochrome warm neutrals, hierarchy from
type scale, and **no accent colour at all** — Phase 8b removed the last of it.
Emphasis is weight, rule and solid ink; `danger` is the only hue in the system.
`DESIGN.md` §3 is authoritative.

`DESIGN.md` is authoritative for every colour, spacing, radius, type and motion
value. Tokens live as CSS variables in `global.css`, mapped in
`tailwind.config.js`. **Components never hardcode a value.**

### 6.5 Typography

**Geist** for interface text, **Geist Mono** for all numeric display. Both OFL,
bundled as static weights via `expo-font` and loaded in the root layout with the
splash screen held until ready. Two weights only: 400 and 600.

Delivered by `@expo-google-fonts/geist` and `@expo-google-fonts/geist-mono`,
which ship the `.ttf` files inside the package — nothing is fetched at runtime.
Import **per weight** (`@expo-google-fonts/geist/400Regular`), never from the
package root: the root module requires all eighteen faces and Metro bundles
every one of them.

Rationale for the mono: `fontVariant: ['tabular-nums']` is reliable on iOS but
inconsistent on Android. A mono face removes the dependency on a font feature
for numeric column alignment. See `DESIGN.md` §2.

### 6.6 Icons

`lucide-react-native`. Sparse usage. No illustration in v1.

---

## 7. Device Capabilities

| Capability | Package | Purpose |
|---|---|---|
| Haptics | `expo-haptics` | Timer completion, set saved, target reached |
| Screen wake | `expo-keep-awake` | Screen must not sleep during an active session |
| Notifications | `expo-notifications` | Local only — rest timer completion |
| Audio | `expo-audio` | Timer cues; must work with the screen locked |
| File system | `expo-file-system` | JSON export |
| Sharing | `expo-sharing` | Hand the export file to the OS share sheet |
| Secure storage | `expo-secure-store` | Reserved for v2 auth tokens |

**Notifications are local only in v1.** No push infrastructure, no server.

**Timer correctness:** timers derive from wall-clock timestamps, never from
accumulated `setInterval` ticks. A backgrounded app must resume with the correct
elapsed time.

---

## 8. Testing

**Minimal by design.** **Vitest** for unit tests only.

Chosen over Jest because nothing under test touches React Native — the subjects
below are pure logic — so no `jest-expo` preset is needed and the default node
environment is enough.

**Test:**
- `lib/timers.ts` — timestamp arithmetic, pause accumulation, background resume
- Aggregation and personal-record queries in `db/queries/`
- Export serialisation round-trip

**Do not test:** UI components, navigation, screen rendering. No React Native
Testing Library, no Detox, no snapshot tests.

Rationale: the logic that can silently corrupt years of training history is
worth testing. Layout is verified by looking at it.

---

## 9. Build & Distribution

### 9.1 Build

**EAS Build**, run **locally from the development machine** in v1. No CI-triggered
builds, no repo integration required.

Three profiles:

| Profile | Purpose |
|---|---|
| `development` | Dev client with native modules, installed on device |
| `preview` | Internal builds — `.apk` for Android, TestFlight for iOS |
| `production` | Store submission builds |

### 9.2 Updates

**EAS Update** for JS-only changes. Native changes require a new store build.

### 9.3 Submission

**EAS Submit** for both stores.

### 9.4 Source Control

**Primary: self-hosted Gitea, private.**
**Mirror: GitHub, read-only, private.**

The mirror exists for portability and as an off-site copy, not as a working
remote. Pushes go to Gitea.

Note: since EAS builds run locally, neither remote needs to be reachable by
EAS. If CI-triggered builds are wanted later, point EAS at the GitHub mirror.

### 9.5 CI

None in v1. Optionally a Gitea Actions job running `tsc --noEmit`, lint and unit
tests on push. No build pipeline.

---

## 10. Store Requirements

*Verified August 2026. Store policies change; re-verify before submission.*

### 10.1 Apple App Store

- Apple Developer Program membership — annual fee (~$99/yr)
- Privacy policy URL required
- App Privacy disclosure required
- TestFlight external testing requires Beta App Review of the **first build per
  version**; subsequent builds of the same version usually clear quickly. There
  is no minimum external tester count.
- Internal TestFlight testers (up to 100) need no review

### 10.2 Google Play

- Google Play Developer account — one-time fee (~$25)
- Privacy policy URL required
- Data Safety disclosure required
- **Closed testing gate:** personal developer accounts created after
  13 November 2023 must run a closed test with **at least 12 opted-in testers
  for 14 continuous days** before applying for production access. Organisation
  accounts and personal accounts created before that date are exempt.

  *This is the long pole on the Android timeline. Start recruiting testers and
  open the closed track well before the app is finished.*

### 10.3 Content Policy

No medical or diagnostic claims. This is a training journal, not a medical
device. Injury-risk warnings, fatigue indices and tendon-load scoring — as
proposed in `requirements_one.md` §4.5 — are out of scope on both product and
store-policy grounds.

---

## 11. Deferred to v2

Nothing here is built in v1. Recorded so v1 schema decisions do not preclude it.

| Concern | Intended tool | Notes |
|---|---|---|
| Auth | Supabase Auth | Email + Apple Sign In. Apple Sign In is mandatory if any third-party sign-in is offered. |
| Cloud database | Supabase (PostgreSQL) | Schema mirrors the local SQLite schema. |
| Sync | Hand-rolled, or PowerSync | Last-write-wins on `updated_at`. Completed sessions are immutable, so the conflict surface is limited to exercise config and templates. |
| Backup / restore | Supabase Storage | Local JSON export covers v1. |
| Web client | Expo Router web, or a separate React app | react-native-reusables components are universal, so the component layer carries over. |
| Crash reporting | Sentry | |
| Analytics (product) | PostHog | Deferred until there are users. |
| Subscriptions | RevenueCat | Deferred until there is something worth charging for. |

**v1 has no accounts, no network calls, and no backend.** The application works
fully in airplane mode from install through years of history.

---

## 12. Explicitly Not Used

| Not used | Reason |
|---|---|
| Docker / Docker Compose | No self-hosted infrastructure in this project |
| Self-hosted Postgres | Local database is SQLite; eventual cloud database is hosted |
| Go backend | No backend exists in v1 |
| Supabase in v1 | Deferred to v2 |
| shadcn/ui (web version) | Web-only; Radix primitives do not exist on native |
| Tamagui / gluestack | Would displace NativeWind or add build complexity |
| Realm / WatermelonDB / MMKV as primary store | SQLite plus Drizzle covers it |
| TanStack Query | No server state to manage |
| Redux | Disproportionate to the state involved |
| Expo bare workflow | Managed workflow is sufficient; ejecting is a one-way cost |
| `crypto.randomUUID()` | Produces v4, not v7 |
| Push notification service | Local notifications only |
| UI / E2E test frameworks | See §8 |
| Ads | Conflicts with the product's identity |

---

## 13. Dependency Policy

- A dependency must earn its place. Prefer the Expo SDK module where one exists.
- No dependency whose failure mode is silent data loss.
- Pin the Expo SDK version; upgrade deliberately, one SDK at a time.
- Every dependency added should be justifiable in one sentence in this document.

### 13.1 Support Dependencies

Not product choices — required by something already chosen, and easy to mistake
for cruft later.

| Package | Why it is present |
|---|---|
| `react-native-svg` | Peer of `lucide-react-native`; the icons are SVG. |
| `react-native-worklets` | Peer of Reanimated 4, which moved its worklet transform out. The Babel plugin is referenced by name, so it must be a direct dependency. |
| `babel-preset-expo` | `babel.config.js` names it, and npm nests it under `expo/` rather than hoisting it, so a bare-name resolve fails without this. |
| `tailwindcss` (v3) | NativeWind v4 compiles against Tailwind 3. Tailwind 4 pairs with NativeWind 5. |

### 13.2 Peer Resolution

`.npmrc` sets `legacy-peer-deps=true`. `expo-router` 57.0.9 depends on
`react-dom` 19.2.8, which peer-requires react `^19.2.8`, while SDK 57 pins react
at 19.2.3. React stays on the version the SDK expects.

**Consequence:** npm no longer installs peer dependencies automatically. Any
peer a package needs — Reanimated's worklets being the first — has to be
installed explicitly, or it silently disappears on the next `npm install`.

---

## 14. Summary

```
Name            Zoomies
Platform        Expo SDK 57 (RN 0.86, React 19.2), managed, iOS + Android
Language        TypeScript, strict
Database        SQLite on device (expo-sqlite) — source of truth
ORM             Drizzle ORM + drizzle-kit migrations
IDs             UUID v7 (uuidv7 package)
Units           kg, added load; durations in seconds
Routing         Expo Router
Styling         NativeWind v4
Components      react-native-reusables (copied in, universal native + web)
Fonts           Geist + Geist Mono (bundled via expo-font)
Icons           lucide-react-native
State           Zustand (ephemeral only)
Device          expo-haptics, expo-keep-awake, expo-notifications, expo-audio
Testing         Unit only — timers, aggregations, export
Build           EAS Build / Update / Submit, run locally
Repo            Gitea (private, primary) + GitHub (private, read-only mirror)
Backend         None in v1 — Supabase in v2
```

---

## 15. Change Log

| Date | Change |
|---|---|
| Aug 2026 | Created. Supersedes stack sections of all three prior documents. Backend removed from v1; local-first SQLite adopted. |
| Aug 2026 | Name finalised as Zoomies. Expo SDK 57 pinned. Component layer decided: react-native-reusables. Units set to kg/added load. Seeding via first-launch seed. Testing scope defined. Repo: Gitea primary, GitHub mirror. Local EAS builds. Visual design direction noted; tokens deferred to `DESIGN.md`. |
| Aug 2026 | `DESIGN.md` created. Geist + Geist Mono bundled, superseding the system-fonts decision. Illustration cut. |
| Aug 2026 | `PLAN.md` created; sequencing moved there. Phase 0 built. Test runner settled on Vitest (§8). Fonts delivered by `@expo-google-fonts`, imported per weight (§6.5). Support dependencies and the `legacy-peer-deps` consequence recorded (§13.1–13.2). |
