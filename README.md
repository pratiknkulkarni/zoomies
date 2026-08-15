# Zoomies

A training journal for calisthenics and gymnastic rings that I built for myself.
One person, one phone, no account, no server, no network calls. It records what
I did so I can look at it later.

It's a journal, not a coach. It won't tell me what to train, correct my form, or
have an opinion about whether I've done enough this week.

<p align="center">
  <img src="media/session.png" alt="Logging a set during a session" width="24%">
  <img src="media/history.png" alt="The history timeline" width="24%">
  <img src="media/exercise.png" alt="One exercise, its records and its trend" width="24%">
  <img src="media/look-back.png" alt="The days-trained grid" width="24%">
</p>

---

## Why I built it

I kept losing track of my sets.

Halfway through a session, four exercises in, forearms burning, I could never
remember whether that was my second or third set of chin-ups. So I'd do an extra
one, or skip one, or stand there for a while trying to reconstruct the last four
minutes. It's a small problem and it happened every single time I trained.

Paper works, but then I have to add it all up. Spreadsheets are out of the question.
I tried three other fitness apps and gave up on all of
them: they were slow, or noisy, or wanted an account and a network connection for ads.

So I wrote one that does two things. It lets me log a set fast while I'm tired
and want the phone out of my hands, and it lets me look back afterwards and see
whether anything is actually improving. If a feature doesn't do one of those, I
didn't build it.

---

## What it does

**Plan.** I set up templates: a list of exercises with the sets I intend to do,
like 3 × 8 chin-ups or a 30 second hold. Editing a template later doesn't change
anything I've already done, because the targets get copied onto the session when
it starts.

**Train.** I start a session from a template. Each exercise shows a running
`2 / 4` counter and what I managed last time. Logging a set is one tap, and the
button says which set it's about to save, so I don't have to count. Holds get a
tap-to-start clock that fills a thin bar and beeps when it hits the target.

**Record.** History is a timeline of sessions, and I can open any one of them
and read it back set by set. Each exercise has its own page with every set I've
ever logged, my best for each metric, and a scatter of my best set over time.

**Look back.** A grid of squares, one per day, filled if I trained. A quarter
fits on screen and it scrolls back as far as my history goes. Underneath: what I
haven't touched in a while, and any records I've set recently.

**Keep.** Export writes the whole database to a JSON file. It's a copy of the
database rather than a summary of it, deleted rows included, so it's an actual
backup. Import is still a WIP.

There are 42 built-in exercises across 12 families, 15 of them switched on to
start with. The rest show up as suggestions once I train something in the same
family. I can add my own, and change what any of them measure.

---

## What it deliberately doesn't do

- **No accounts, no sync, no network.** There's no server and the app makes no
  network calls at all. It works in a basement and on a plane.
- **No streaks.** There's a row of seven dots for the week and no number next to
  it. No flame, no counter, no penalty for missing a day.
- **No celebration.** If I beat a record it says so. No confetti, no numbers
  counting up, no animation.
- **No accent colour.** Emphasis comes from weight, rules and solid black. The
  only colour in the whole app is the red used for dangerous actions like delete and discard.
- **No shadows, gradients, blur or elevation.**
- **No illustrations or empty-state graphics.**
- **No gamification, analytics, ads (obviously), subscriptions or social features.**

Two rules I care about more than they probably sound:

- **Null means "not recorded". Zero means zero.** If I didn't type a value it
  isn't stored as `0`, and it shows as `—`.
- **The app never tells me to do more.** A target only goes up if it offers to
  raise it after I've beaten it, and only if I beat it on most of my sets rather
  than one good one.

Both themes follow the system setting. Every colour token has a dark value, so
there isn't a single theme conditional anywhere in the components.

<p align="center">
  <img src="media/session-dark.png" alt="A session in the dark theme" width="24%">
  <img src="media/history-dark.png" alt="The timeline in the dark theme" width="24%">
  <img src="media/exercise-dark.png" alt="An exercise in the dark theme" width="24%">
  <img src="media/look-back-dark.png" alt="The grid in the dark theme" width="24%">
</p>

---

## Stack

| Layer | Choice |
|---|---|
| Platform | Expo SDK 57 (React Native 0.86, React 19.2) |
| Language | TypeScript |
| Database | SQLite on the device via `expo-sqlite` |
| ORM | Drizzle ORM with `drizzle-kit` migrations |
| Routing | Expo Router |
| Styling | NativeWind v4 |
| Components | `react-native-reusables`, copied in and edited |
| Icons | `lucide-react-native` |
| Fonts | Geist and Geist Mono. Anything numeric is mono (iirc) |
| State | Zustand for ephemeral state only. Anything that matters goes to SQLite |
| IDs | UUID v7, so rows sort by time on their primary key |
| Charts | None |

---

## Running it

```bash
npm install
npm start                 # Expo dev server
npm run android           # build and run on a device or emulator
```

If the native Android project is missing (which it might if I switch laptops or reinstall OS):

```bash
npx expo prebuild --platform android --no-install
printf 'sdk.dir=%s/Android/Sdk\n' "$HOME" > android/local.properties
```

> Both lines matter. `prebuild` writes everything except `local.properties`, which is machine-specific and the one file it won't recreate.

```bash
npm run typecheck
npm run lint
npm test
npm run deploy            # debug APK onto the attached device
npm run release -- minor  # signed APK, tagged and published to Releases
```

To install it, download the APK from
[Releases](https://gitea.15092021.xyz/pratik/zoomies/releases) on the phone.
**It's not on any store.**

---

## Tests

285 unit tests, aimed at the places where being wrong wouldn't be obvious: timer
arithmetic, working out personal records and handling ties, the rule that
decides whether to offer a target increase, week and day boundaries, formatting,
export completeness, and the parsing that keeps null and zero apart. Fully generated using Claude.

The export test runs against the real `db/schema.ts` and discovers tables and
columns rather than being given a list, so adding a table can't quietly start
producing incomplete backups.

There are no component, navigation, snapshot or E2E tests. I check the interface
by hand on a Pixel against a written smoke test, and where I haven't checked
something I write that down instead of pretending otherwise.

---

## How this was built

I wrote this with [Claude Code](https://claude.com/claude-code). The part I think is worth
explaining is what I had to put around it to get something that holds together.

I wrote four specification documents before any code: what the app does and how
the data is shaped, what it's built with, the visual system down to the spacing
scale, and the order I'd build it in. Each one was the final say in its own area,
and when I wanted something that contradicted one of them, I had to change the
document first. `CLAUDE.md` in this repo sits on top of those and holds the rules
that can't be broken, the conventions, and a list of things I've decided not to
build.

I worked in eleven phases and finished each one on a real phone before starting
the next. A few decisions in here are ones I reversed: I specified a rest timer
and then cut it before building it, I planned for a charting library twice and
didn't need it either time, and I rebuilt the metric editor rather than patch it
a fourth time.

The specs, the build plan, the development log and my engineering notes are in a
separate private repo. This README and `CLAUDE.md` are the public part.

---

## Status

Version 1, and I use it. Android only so far. Nothing in the code is
iOS-specific and I haven't tried it there. It isn't going on a store. Bugs and
ideas go to [Issues](https://gitea.15092021.xyz/pratik/zoomies/issues).
