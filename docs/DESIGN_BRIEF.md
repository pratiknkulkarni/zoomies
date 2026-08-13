# Design Brief — Zoomies

**Document type:** Input to a design process. **Not a specification.**

This document describes a person, a problem, and a set of jobs. It deliberately
contains **no design decisions** — no palette, no typeface, no spacing scale, no
component inventory, no navigation model, no screen list. Those are the output,
not the input.

> **If you are working in this repository:** `docs/DESIGN.md` remains
> authoritative for every visual decision. This file exists to run an
> experiment — to see what a design arrives at when given only the problem — and
> must never be read as a spec or used to justify a change.

Written to be self-contained. It assumes no knowledge of the codebase and can be
handed over on its own.

---

## 1. What the application is

**Zoomies** is a training journal for calisthenics and gymnastic rings. One
person, one phone, no account, no server, no other users. It records what you
did, so that later you can see what you did.

It is a **journal**, not a coach. It does not prescribe workouts, correct form,
suggest progressions, or have an opinion about whether you trained enough. It
holds a record and shows it back accurately.

Everything lives on the device. It works in a basement with no signal and on a
plane. There is nothing to sync, nothing to log into, and no moment where it
waits on a network.

---

## 2. The problem it exists to solve

The application exists because of one specific, repeated, ordinary failure:

> **Sets get forgotten or missed during training, because you are tired.**

Halfway through a session, four exercises deep, forearms burning, you cannot
reliably remember whether that was your second or third set of chin-ups. You
either do an extra one, or skip one, or stand there trying to reconstruct the
last four minutes. It is a small failure and it happens constantly.

Every feature must serve one of exactly two purposes:

1. **Fast logging during training**, when you are tired, breathing hard, and
   want the phone out of your hands.
2. **Reflection after training**, when you are sitting down and want to know
   whether anything is actually moving.

A feature serving neither does not belong, however good it is.

---

## 3. Who uses it

One person. The person who built it. There is no second persona, no beginner
mode, no onboarding funnel, no market segment.

Assume someone who:

- trains bodyweight and rings, mostly alone, two to five times a week
- already knows what a front lever is and does not need it explained
- keeps notes because memory is unreliable, not because they enjoy data
- has abandoned three other fitness apps for being loud, slow, or dishonest
- is mildly suspicious of anything that looks like it wants engagement

They are not tracking to share, to compete, or to be motivated. They are
tracking because **they want to know**, and because forgetting a set is
annoying.

---

## 4. Where it is actually used

This section matters more than any feature list. Design for these three
situations and almost everything else follows.

### 4.1 Mid-session, between sets

The dominant context, and the hardest.

The phone is on the floor, on a bench, or balanced on a rig. It gets picked up
with hands that are chalky, sweaty, or shaking slightly. Grip is shot. Fine
motor control is measurably worse than normal. The session might be in a garage
at night, a park at dusk, or a room with one lamp on.

The window is the rest interval: **60 to 180 seconds**, part of which is spent
walking around and breathing. Logging a set should consume a small fraction of
that and then be over. If someone has to think about the interface, the
interface has already failed — the thing being thought about should be the
training.

Two things are being asked constantly, and both should be answerable *without
reading carefully*:

- **How many sets have I done of this?**
- **What is left in this session?**

The phone gets put down mid-interaction with some regularity. Someone walks
over, a set starts, a timer goes. Whatever was on screen has to survive being
abandoned for four minutes and picked up again, and the application being
force-killed by the operating system in between.

### 4.2 Immediately after, still in the room

Sitting on the floor, session over, mildly wrecked. This is the moment for
"what did I actually just do" — a look back over the whole session, a note about
how it felt while it is still true, and then closing the application.

It is a short, unhurried moment. Nothing here should feel like a summary screen
demanding acknowledgement.

### 4.3 Days or weeks later, on the sofa

Fully rested, unhurried, curious. Questions like:

- Have I actually trained this month, or does it just feel like I have?
- What am I neglecting? When did I last do ring dips?
- Is my hold getting longer, or has it been forty seconds for three months?
- What did I do the last time I trained this?

This is reading, not operating. Density is welcome here in a way it is not
mid-session. It is also the only context where a chart could earn its place.

---

## 5. The vibe

This is the part to get right. If the feeling is wrong, correct features will
not save it.

### 5.1 What it should feel like

**A well-kept notebook.** Not a dashboard, not a device readout, not a coaching
platform. Something with the calm of a page that someone has been writing in for
a year — where the value is in the accumulation and the consistency of the hand,
not in any single entry being impressive.

**Trustworthy to the point of boring.** The single most important emotional
property is the certainty that it will not lose anything. Nothing you enter
should ever feel provisional, in-flight, or dependent on you pressing something
else afterwards. The correct feeling when closing the app mid-session is
complete indifference — of course it saved, why would it not.

**Unhurried.** Nothing counts down at you, nags, or implies you are behind. The
application has no opinion about your schedule and never acquires one.

**Quiet enough to use at 6am and at 11pm** without adjusting anything, in a dim
garage or in direct sun.

**Fast in the specific way that matters:** the distance between deciding to
record a set and having recorded it should be as close to zero as the platform
allows. Not "fast" as in animated smoothly — fast as in *few decisions*.

**Honest about absence.** Blank stretches are part of a training record. A month
where nothing happened should look like a month where nothing happened. It
should not be hidden, apologised for, filled with encouragement, or scored.

### 5.2 What it is emphatically not

**Not a wellness product.** No softness for its own sake, no rounded reassuring
tone, no "you've got this", no gentle gradients implying calm. The person using
this is doing something physically hard on purpose.

**Not a hype fitness app.** No shouting, no aggressive contrast, no motivational
imperatives, no energy. Nothing that would look at home next to a supplement
advert. The application is not excited and should not pretend to be.

**Not a spreadsheet.** Density is not the goal and neither is completeness of
display. This has to be usable one-handed by someone whose hands do not
currently work well. Precision without legibility is a failure.

There is a narrow space between those three, and that space is where this lives.

### 5.3 The register of its language

Words are part of the design here, not filler to be replaced later.

- **Plain and factual.** State what is true. `Not trained yet` rather than
  `No data available` and certainly rather than `Time to get started!`
- **Second person, no exclamation marks, no imperatives that aren't buttons.**
- **Never congratulatory.** A personal record is stated the way a fact is
  stated. It is information about your training, not an award.
- **Never apologetic.** An empty screen names what will eventually be there. It
  does not say "Nothing here yet" as though something has gone wrong.
- **No jargon it did not need.** But also no explaining of terms the user
  obviously knows.

### 5.4 Silence is a feature

When there is nothing to say, say nothing. A surface with one meaningful figure
on it is better than the same surface with that figure plus four others added so
it does not look empty.

This applies especially in the first weeks of use, when almost every view is
nearly empty. **Design for the sparse case first.** An interface that only looks
right once it is full of data is wrong, because it will be wrong for the first
month and after every break.

---

## 6. What a person needs from it

Deliberately phrased as questions and jobs rather than as screens. **How this is
arranged — what surfaces exist, how they nest, how you move between them — is
part of what is being designed and is not decided here.**

### 6.1 While training

- What am I doing right now, and how many sets of it have I done?
- What is still ahead of me in this session?
- Record this set: some numbers, occasionally a note, occasionally a mark that
  it was taken to failure.
- Some efforts are held rather than counted, so something has to time them, and
  the timing has to survive the screen locking or the app being backgrounded.
- Correct the set I just mis-entered.
- Add something I decided to do on the spot, which was not in the plan.
- Pause, because the session genuinely stopped — a phone call, a queue for the
  bar — as distinct from simply resting between sets.
- Stop, and have it be over.

### 6.2 Right after

- What did I just do, in full?
- Note how it went, while it is still true.
- Did I beat anything I was aiming at? And if so, should the plan change?

### 6.3 Later

- Have I been training? What did the last few weeks actually look like?
- What am I neglecting — what have I not done in a suspiciously long time?
- What did I do the last time I trained this exercise, and was today better?
- What is the best I have ever done at this, and when?
- Show me one movement across its entire life, everything ever logged for it.
- Show me one past session in full, and let me fix something I got wrong in it.
- Delete a session that should not be in the record.

### 6.4 Between sessions

- Keep a small number of reusable plans — an ordered list of exercises, each
  with an optional target such as three sets of nine.
- Edit those plans without touching anything already recorded.
- Maintain the list of movements I actually train, out of a much larger
  catalogue of ones I might.
- Define what each movement records — some are counted, some are held, some
  carry a note.
- Get my data out, as a file, because it is mine.

---

## 7. Facts about the data that constrain any design

These are properties of the domain. A design that contradicts them cannot be
built.

**Different exercises measure different things.** One records repetitions.
Another records seconds held. Another records both, plus a free-text note. A
design that assumes every set is "reps × weight" does not fit this domain at
all.

**Reps and seconds do not add up.** There is no meaningful total across a
pull-up and a ring support hold. Any single combined "volume" or "score" number
would be invented, and inventing it is worse than not having it. This is the
single hardest constraint on any analytics: everything must be either
**per-exercise** or a **count** (of sessions, of sets, of days).

**Unrecorded is not zero.** If someone logged the reps but not the note, the
note is *missing*, not empty, and definitely not `0`. These two states must be
visibly different wherever a value is shown. Showing `0` for something never
entered is a lie about the training.

**Nothing aggregated is stored.** Totals, bests and trends are computed fresh
every time from the individual sets. There is no cached "best ever" that can
drift. A consequence for design: any figure shown is derived, and correcting a
single old set has to be able to change it.

**History is immutable by accident.** Editing a plan must never rewrite what a
past session says it did. Targets are copied onto the session when it starts. A
design that shows "your target" in history must be showing the target that was
actually in force that day.

**Three kinds of session exist** and any history view will contain all three:
one run from a saved plan, one made up on the spot, and a one-off log of a
single exercise done outside of training entirely — five pull-ups on a doorway
bar in the evening. The third kind is real training and belongs in the record,
but it is not a *session*, and counting it as one would make the session count
meaningless.

**A single exercise can appear twice in one plan** — pull-ups to open, pull-ups
again as a finisher, with different targets.

**One session at a time.** There is never a second one running.

---

## 8. Hard constraints

- **Phone only.** iOS and Android. No tablet layout, no web, no watch.
- Built in **React Native (Expo)**, styled with a Tailwind-like utility system.
  Anything proposed has to be buildable there and behave identically on both
  platforms without per-platform special cases.
- **Fully offline. No network calls of any kind, ever.** Nothing loads
  remotely — no fonts fetched at runtime, no remote images, no analytics.
- **Local database is the source of truth.** Writes commit before the interface
  moves on. Force-quitting mid-session loses nothing.
- **Used with impaired hands in poor light.** Touch targets need to be
  forgiving. Anything requiring precision, a steady hand, or a confident swipe
  in a specific direction will fail in the exact moment it matters.
- **Legible while moving and while out of breath**, at arm's length, on the
  floor.
- **Figures change while being watched.** A running timer, a set counter
  incrementing. Numerals should not make the layout jitter as they change.
- **Both light and dark**, following the system, without the design becoming a
  different design in either.
- **Single-handed reachability matters.** The other hand is often occupied,
  chalky, or hanging off something.
- **No illustration, no photography, no decorative imagery.** Not deferred —
  cut. The interface is text, numbers, and structure.

---

## 9. What this application refuses to do

These are settled product decisions. They are constraints, not open questions,
and a design that reintroduces them has misread the brief.

**It does not congratulate you.** No confetti, no counting-up numbers, no
animated reveals, no badges, no experience points, no levels, no trophies. A
personal record is stated once, factually, and that is the whole of it.

**There is no streak.** No count of consecutive days, no flame, no "don't break
the chain", no penalty or visual loss for a rest day. It may show *which* days
in the recent past had training — that is a fact about the past. It must never
attach a number to that fact or imply a run is at risk. Rest days are training.

**It does not score you.** No composite index, no readiness figure, no
percentage of a goal, no comparison to anyone, no predicted maximum.

**It does not coach.** No suggested progressions, no "you should try", no
program generation, no form feedback.

**It does not want your attention.** No notifications that are not a timer you
started, no re-engagement, no daily reminder, no "you haven't trained in a
while".

**It has no social surface.** No sharing, no export-to-image, no friends, no
leaderboards.

Excluded for the same reason: calorie estimates, muscle-group heatmaps,
time-in-app, and anything measuring engagement rather than training.

The unifying principle: **the application never tries to make you train.** It
assumes you will, and its only job is to be accurate and out of the way when you
do.

---

## 10. What is genuinely open

Everything not listed above, including:

- The whole visual direction — colour, typography, weight, density, rhythm
- Whether there is an accent colour at all, and if so how much it is used
- The information architecture: what surfaces exist and how they relate
- How a live session is presented, which is the highest-stakes surface
- How a set is entered — the interaction that happens hundreds of times
- How targets and progress are expressed without becoming a score
- What, if anything, is shown on first launch when there is no data at all
- Motion: whether there is any, and what it is for
- How a personal record is marked without celebrating it
- How the sparse case and the dense case are both made to look intentional

---

## 11. What to produce

A design document that someone could build from, covering at minimum:

1. **The direction, in a paragraph**, and why this problem calls for it. Name
   what you are deliberately *not* doing.
2. **Colour**, with every value given for both light and dark, and a rule for
   where each is allowed to appear.
3. **Typography** — the faces, the sizes, the weights, and what each is for.
   Justify how many weights are genuinely needed.
4. **Spacing and layout** — a scale, and the reasoning for its steps.
5. **The components that exist**, described precisely enough to build: what a
   row is, what a button is, what a field is, what a section is.
6. **The live session surface in detail.** It is used tired, and it is where the
   application either works or does not.
7. **How a set is entered**, step by step, with the number of taps counted.
8. **Empty states** for every surface, since the first month is nothing but.
9. **Motion**, if any, with durations and a justification for each one.
10. **The rules a future contributor must not break**, stated as rules.

Where a decision was close, say what the alternative was and why it lost. The
reasoning is more valuable than the answer.

---

## 12. One last thing

The application is called **Zoomies** — the name for the sudden burst of
energy a dog gets for no reason, tearing around the garden at full speed and
then flopping over.

That is a joke about the owner, not a brief for the interface. The application
itself is the opposite: patient, quiet, and entirely unexcited. The name is the
only playful thing about it, and it should stay that way.
