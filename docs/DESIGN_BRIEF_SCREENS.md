# Design Brief — Zoomies — Every Screen

**Document type:** Input to a design process. **Not a specification.**

This document describes a person, a problem, a set of jobs, and the sixteen
screens the application needs. It deliberately contains **no design decisions** —
no palette, no typeface, no spacing scale, no component inventory, no layout.
Those are the output, not the input.

The screens are named here because coverage is the point of this run. What each
one *looks like*, what it puts first, and how you move between them is entirely
open.

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

## 6. Facts about the data that constrain any design

These are properties of the domain. A design that contradicts them cannot be
built.

**Different exercises measure different things.** One records repetitions.
Another records seconds held. Another records both, plus a free-text note. A
design that assumes every set is "reps × weight" does not fit this domain at
all.

**A single set can carry more than one measurement.** `12 reps, felt strong` is
one set with two values on it. So is `31 seconds, 12 reps` for an exercise
configured to record both. Any row, line or component that displays a set has to
survive carrying two or three values at once, and has to survive one of them
being missing while the others are present. **A design where a set is one number
has misread this.**

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

**Nothing is ever really deleted.** A deleted session disappears from every
view, but the record survives underneath for export. Design accordingly: undo is
cheap, and a deletion does not have to be treated as irreversible.

**One session at a time.** There is never a second one running.

---

## 7. Hard constraints

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
- **No photography.** No stock imagery, no textures, no decorative fills.
  Drawings are addressed separately in §10 and are the *only* exception.

---

## 8. What this application refuses to do

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

## 9. The screens

Sixteen screens exist, plus one that does not yet. They are listed by **the job
each does** — not as a navigation tree, and not in a fixed order. How they are
grouped, what the application opens to, and whether some of them should be
reached one way rather than another is part of what is being designed.

**If two of these should be one screen, say so and draw it that way.** The list
describes work the application has to make possible, not seventeen mandatory
frames. What it must not do is quietly drop the awkward ones — a design that
solves the training screens and waves the plan-editing screens away as "settings"
has answered an easier question than the one being asked.

### While training

**1 · Live session.** Every exercise in the session, each showing how many sets
have been done against how many were planned — the answer to *what is left*,
readable without opening anything. This is the highest-stakes surface in the
application. It also holds pause, and the way to end the session, and the way to
add an exercise that was not in the plan.

**2 · One exercise, live.** Where sets actually get recorded, hundreds of times.
It carries: the target for today, what was done the last time this exercise was
trained, the sets recorded so far in this session, the control that records the
next one, a note field, and a mark for *taken to failure*. For a held exercise
it carries a running clock instead of a count — one that keeps true time across
the screen locking, the app being backgrounded, and the app being killed.

**3 · Quick log.** Five pull-ups on a doorway bar in the evening. Pick an
exercise, enter values, done — no session is started and none is shown. Reached
in one step from wherever the application opens.

**4 · Session review.** Between the last set and history. Everything that
happened, what was planned but never trained, and a note about how it went. It
is the moment described in §4.2 — a look back, not a summary demanding
acknowledgement.

### Reading it back

**5 · Home.** Where training starts. Holds the small number of saved plans and
the ways into a session, a quick log, or a session with no plan at all.

**6 · Dashboard.** *Does not exist yet — it is the next thing to be built, so
this is a genuine design question rather than a redraw.* Reflection at a glance:
whether training has been happening lately, and what is being neglected. It must
obey §8 — no streak count, no score, no combined total. Whether it is its own
surface or part of Home is open.

**7 · History.** Every finished session, newest first. Training clusters — two
things on one day, then nothing for three — and the gaps are part of the record.
All three kinds of session appear here, and a one-off must not be mistakable for
a planned session.

**8 · One session, read back.** Every set of every exercise visible at once,
with the date, the length of the session, the targets that were in force that
day, and any notes. Its name and its note can be corrected. It can be deleted.
Correcting an individual set from here is possible.

**9 · One exercise, all time.** One movement across its entire life: what it
records, the best ever recorded for each thing it measures and when, and every
set ever logged for it, grouped by the session it happened in. It spans plans,
one-offs and sessions with no plan. This is the surface where a chart could
earn its place, and the only one.

### Keeping it in order

**10 · Exercises.** The list of movements actually trained, drawn from a much
larger catalogue of ones that might be. The rest of the catalogue is available
as suggestions, grouped by family, without cluttering the working list.

**11 · One exercise, edited.** Its name, which family it belongs to, a note, and
**what it records** — the ordered list of measurements, each one counted, held,
or free text. Adding and removing a measurement here must never alter a single
set already recorded.

**12 · A new exercise.** Making one that is not in the catalogue. Identical to a
built-in one once it exists.

**13 · Archived.** Movements put away rather than deleted, and the way back.
Deliberately out of the way; the route to it should barely exist.

**14 · One plan.** An ordered list of exercises, each with how many sets and an
optional target. Always a statement about the *next* session, never about a past
one. Reordering, removing and adding happen here.

**15 · Adding to a plan.** Choosing exercises to put on it. Usually several in a
row, so it should not throw you out after each one.

**16 · One entry in a plan.** How many sets, and of what — for example three
sets of nine reps, or three sets of thirty seconds. **Every field here can be
empty, and empty means something specific:** no target sets means the count
accumulates with nothing to reach; no target measurement means there is nothing
to beat. Leaving a field blank is a decision, not an omission.

**17 · A new plan.** A name, and then straight to filling it.

### The states that are not screens, and must also be drawn

- **First launch.** No plans, no exercises trained, no history, nothing at all.
- **An unfinished session, found on reopening.** The application was killed
  mid-session, or the session was abandoned two days ago. Everything logged
  survived. What does it do about it?
- **Leaving a screen with unsaved changes.** Some screens write as you type;
  others hold a draft until you save it. Where a draft exists, leaving with
  unsaved work has to be caught — including by the phone's own back gesture.
- **Picking from a long list.** Choosing an exercise out of a hundred or more.
- **Confirming something destructive.** Deleting a session out of the record.

### Realistic content to draw with

Use real material, not `Exercise 1`. The movements are things like Pull-Up,
Chin-Up, Ring Dip, Ring Support Hold, Ring Row, L-Sit, Front Lever (Tuck),
Pike Push-Up, Nordic Curl, Hollow Body Hold. Plans are called things like
`Pull Day`, `Rings A`, `Legs & Core`. Counted sets run `10 · 9 · 9 · 7`; held
ones run `31s`, `42s`. Notes read like `felt strong`, `grip went first`,
`left side weaker`. Progression is part of the name — `Front Lever (Tuck)` —
and is never a separate tracked dimension.

---

## 10. The drawings

This run commissions something the application has never had: **a small set of
line drawings.** It is an experiment, and a refusal is an acceptable outcome if
it is argued.

**The risk, stated plainly:** a doodle is the single fastest way to make this
look like a habit tracker. Everything in §5 and §8 is holding the application
away from that, and one cheerful drawing in the wrong place undoes it. Solving
that is the commission. Do not solve it by making the drawings tasteful and
putting them everywhere.

**The rules are hard:**

- **Ink only.** The drawings use the same greys and blacks as the text. If the
  design has an accent colour, a drawing never uses it — the accent is the
  scarcest thing in the application and a drawing does not get to spend it.
- **Only where nothing is being read.** First launch. An exercise never trained.
  A month with no training in it. An empty archive. A plan with no exercises in
  it yet. A surface showing a real figure shows no drawing.
- **Never during training.** Not on the live session surface, not beside a
  running clock, not near the control that records a set. §4.1 is the whole
  reason this application exists and nothing decorative goes there.
- **Never as feedback.** Not a reaction to finishing a session, to a personal
  record, to a rest day, or to anything the person did. It is furniture, not
  applause. §8 still holds — a drawing that congratulates breaks it exactly as a
  badge would.
- **One per surface at most**, and the surface has to still make sense with it
  removed.
- **Drawn in one hand throughout.** A single line weight, matching the finest
  rules in the interface. No fill, no shading, no gradient, no perspective, no
  character with a face doing an activity.

**The question to answer: what are they of?**

The application is called **Zoomies** — the name for the sudden burst of energy a
dog gets for no reason, tearing around the garden at full speed and then flopping
over. Until now that has been treated as a joke about the owner and not a brief
for the interface, and the name has been the only playful thing about the whole
application.

For the drawings, and only the drawings, that clause is suspended. Take the
invitation or refuse it — a rings frame, a chalk mark, a doorway bar, a dog
asleep, nothing at all — but say which you did and why. **If the honest answer
is that this application should have no drawings in it, say that, and show the
empty states without them.** That is a result.

---

## 11. What to produce

**Screens, drawn.** Not a design system document. The bulk of what comes back
should be phone frames, and everything else should be short enough to read
standing up.

1. **Every screen in §9, drawn** in a realistic phone frame with realistic
   content from the list above. Real names, real dates, real numbers.
2. **The empty state of every screen that has one, drawn** — not described. §5.4
   is not a footnote here; the first month is nothing but these, and half the
   design lives in them.
3. **Both themes for the four that matter** — live session, one exercise live,
   one exercise all time, history. The rest in one theme is fine.
4. **One line under each screen:** what it solves, and the one decision that was
   close. One line. Not a paragraph, not a section.
5. **The drawings**, shown at the size they actually appear, with a note on
   where each may be used — or the argument for having none.
6. **A short appendix, and only this:**
   - the colour values, both themes, with a rule for where each may appear
   - the type scale — faces, sizes, weights, what each is for
   - the spacing steps
   - the components that exist, described precisely enough to build
   - **how a set is recorded, step by step, with the taps counted**
   - the rules a future contributor must not break

The appendix should be readable in two minutes.

**Do not write chapters.** A previous run of this brief produced eleven sections
of prose and five screens, which is exactly backwards. If a decision needs
defending, defend it in one sentence under the screen it affects.

---

## 12. Two things worth checking before you finish

**A set with two values on it.** Go back to §6 and check that every place a set
appears — the live logging surface, a session read back, an exercise's whole
history — still works when a set carries `31s` *and* `12 reps` *and* a note, and
when one of those three is missing while the others are there.

**The awkward screens.** The plan editor, the entry with four nullable fields,
the archive, the picker. They are half the list in §9 and they are where an
interface usually stops being designed and starts being assembled.
