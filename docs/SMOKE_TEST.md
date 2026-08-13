# Smoke Test — Phases 0 to 4, and the Phase 6 device pass

**Document Type:** Working record. Delete or archive once its findings are
resolved.

Everything built so far, walked end to end on a physical device. The point is to
find what is wrong or annoying *before* Phase 5 adds more surface on top of it.

Sections A to L are that walkthrough and are **closed**. Sections M to O at the
end are a separate, narrower pass: the three Definition-of-Done items Phase 6
closes, which cannot be verified any other way.

## How to use this

Work top to bottom. Each check has steps and what should happen. Fill in the
**Observed** line — a bare `ok` is a perfectly good answer, and the interesting
ones are where you disagree with the expectation or where something is merely
irritating rather than broken.

Tag anything worth acting on:

- `BUG` — it does the wrong thing
- `UX` — it works but is awkward, slow, or unclear
- `COPY` — wording is confusing or wrong
- `DESIGN` — it looks wrong, cramped, misaligned, or off-token
- `Q` — you are not sure what it was supposed to do

Do not worry about duplicates or about being fair. Record the reaction.

**Already known — no need to re-report:**

- Adding an exercise to a template gives no feedback on the row, and tapping the
  same one twice adds it twice. Fix agreed.
- The `Reps` metric is seeded with unit `reps`.
- The metric editor caption is being rewritten.
- Haptics fire only on saving a set in a session, nowhere else. Timer haptics
  are Phase 5.
- The History tab is a Phase 7 placeholder and says so.

---

## A. First launch

**A1.** Open the app cold.

Expect: it opens on Home. No crash, no white flash of unstyled text.

**Observed:**
No issues here, same as expected. 

**A2.** Look at the fonts. Headings and body should be Geist. Any number —
counters, set indexes, targets — should be Geist Mono and visibly different.

Expect: two clearly distinct typefaces, and numbers that line up in columns.

**Observed:**
No issues here, same as expected. 

**A3.** Pull down the system shade and flip the device between light and dark.

Expect: the app follows immediately, no relaunch. Nothing unreadable, no pure
white and no pure black anywhere.

**Observed:**
Same as expected, perhaps we could have a settings tab where we could set theme to auto/dark/light? Don't add anything just yet, but log it somewhere on things we could add.
---

## B. The Exercises tab

**B1.** Open Exercises. Scroll the whole list.

Expect: around 15 exercises, alphabetical, each with a subtitle naming what it
records — `Reps · Added load (kg)` or similar. Below the library, a **Suggested**
section grouped by movement family.

**Observed:**

**B2.** Read the subtitles specifically. Do they tell you anything useful?
UX - So it currently states hold(s) and rep(s) or reps - added load (kg). This is good, but perhaps we could make it more intuitive? Or perhaps we could add in the deafault values here, like 10 reps (for pushups) or 20 seconds (for lsit hold) and if nothing has been set, we could either have a default set and display that or keep it empty to indicate this one is a default and nothing comes up here? I am still open to suggestions here.

**Observed:**

**B3.** Tap a suggestion to activate it.

Expect: one tap. It moves into the library and leaves Suggested immediately, no
confirmation step.

**Observed:**

No issues here, same as expected. 

**B4.** Dismiss a different suggestion.

Expect: it disappears. Force-quit the app, reopen, and check it has not come
back.

**Observed:**
No issues here, same as expected. 

**B5.** Open any exercise — say Pull-Up.

Expect: its name, its metrics listed in order with the first marked `Primary`,
and its family. No logging history yet unless you have trained it.

**Observed:**
No issues here, same as expected. 

---

## C. Custom exercises and metrics

**C1.** Exercises → create a new exercise. Give it a name only, leave family and
notes empty, create it.

Expect: it creates and drops you straight into its editor, with no metrics yet
and a line saying nothing is recorded for it.

**Observed:**
UX - For the family, I would like Family to be populated, in dropdown or otherwise. If I am creating a new family, I should be able to do it from here. Naming errors for pushup, push-up, push up might happen and I don't want to think about all thsi when I'm working out and just got introduced to a new workout.

**C2.** Add a metric: name it, pick `Number`, give it a unit, add it.

Expect: it appears in the list, marked `Primary` because it is first.
UX - Make it more explicit on what needs to be done like we discussed. Also, for metrics, dropdown or tablets should be visible instead of manually typing them. If I type manually and nothing exists in the existing set of units, add it and then also save this metric under that unit. So I don't want to type reps or kg or KG or Kg and get confused, if that makes sense. 

UX - family should NOT underscore in the placeholder, currently it has front_level. No. No underscores anywhere.

BUG - When I'm typing the metrics (or selecting from dropdown in the future), they keyboard is covering it entirely so I can't see what I'm typing and I need to hide the keyboard. Check screenshot in temp/c2.jpeg in project root.

**Observed:**

**C3.** Add a second metric, this time a `Duration`.

**Observed:**
BUG - When I'm typing the metrics (or selecting from dropdown in the future), they keyboard is covering it entirely so I can't see what I'm typing and I need to hide the keyboard. Check screenshot in temp/c2.jpeg in project root.

UX - Just show save or something instead of add another metric when I have added more than one. Currently, I add seond one and it shows an option to add metric which adds a third one; what I want to do is just I'm done and move on. Or does this make sense the way it is, I am not sure.

**C4.** Use the arrows to move the duration metric to the top.

Expect: `Primary` moves with it. This is the setting that decides whether
logging shows a stopwatch or a number field, once Phase 5 lands.

**Observed:**
This is fine.

**C5.** Rename a metric — tap its name, change it, tap elsewhere to commit.

Expect: it saves on blur, with no explicit save button.

**Observed:**
- Fine
- UX - Make the Edit/Archive/Delete a bit better, perhaps make it row oriented instead of column.

**C6.** Clear a metric name completely and tap away.

Expect: it reverts to what it was, rather than saving an unnamed metric.

**Observed:**
FINE

**C7.** Delete a metric.

Expect: it goes, and the one below moves up to become `Primary` if it was first.

**Observed:**
FINE 

**C8.** Read the explanatory line above the metric list. Ignore the current
wording, which is being rewritten — instead say whether, after doing C1 to C7,
you now understand what "Primary" buys you.

**Observed:**
- No, primary is still a bit weird to me.

---

## D. Archiving

**D1.** Open an exercise you do not use and archive it.

Expect: it leaves the Exercises list. A link to archived exercises appears on
the Exercises tab — that link only exists while something is archived.

**Observed:**
FINE, rather perfect. I like when archive shows only if there are any archives and we navigate there.Doesn't clutter the screen.

**D2.** Open the archived screen and unarchive it.

Expect: it returns to the library, and the archived link disappears once nothing
is archived.
Fine

**Observed:**

**D3.** Archive every exercise in one family — for example both pull-up variants.

Expect: the Suggested section still offers other exercises from that family. It
should not conclude you dislike the whole family.

**Observed:**
FINE

---

## E. Templates

**E1.** Home → create a template. Name it something real, like `Push day`.

**Observed:**
FINE

**E2.** Add three exercises to it.

Expect: they append in the order tapped.

**Observed:**
FINE 

**E3.** Reorder them with the arrows. Move the last one to the top.

Expect: the order holds. Leave the screen, come back, confirm it stuck.

**Observed:**
FINE 

**E4.** Remove the middle slot.

Expect: it goes and the remaining two close the gap, still in order.

**Observed:**
FINE 

**E5.** Open a slot and set a target: 3 sets × 8 reps, 60 seconds rest.

Expect: the template row now reads something like `3 × 8 reps · 60s rest`.

**Observed:**
FINE 

**E6.** ~~Rest timer null-versus-zero.~~ **Retired.** The rest timer is cut
(`FEATURES.md` §15) and `rest_seconds` is dropped by migration 0003, so there is
nothing left to check here. The null-versus-zero rule it tested is invariant 2
and still holds everywhere else — it lives in `lib/parse.ts` and its tests now.

**E7.** Set a slot's target sets but no target value.

Expect: it says `3 sets`, not `3 × null` or `3 × 0`.

**Observed:**
FINE 

**E8.** Rename the template. Then go back to Home.

**Observed:**
FINE 

**E9.** Create a second template with one exercise in it, so there are two on
Home.

**Observed:**
FINE 

---

## F. Starting a session

**F1.** From Home, start a session from your `Push day` template.

Expect: the session screen lists exactly the exercises in the template, in the
template's order, each showing its target and a `0 / 3` counter.

**Observed:**
FINE 

**F2.** Note down what the targets say. You will check these again in section J.

**Observed:**
FINE 

**F3.** Go back to Home without finishing.

Expect: Home shows the session as in progress, with a way back into it.

**Observed:**
FINE 

---

## G. Logging sets

**G1.** Open the first exercise in the session.

Expect: a field per metric, a stepper beside each number, a **To failure**
toggle, and a save action. Also a `Last time` line if you have trained it before
— on a first run there will be nothing.

**Observed:**
UX - Make the to failure a bit smaller, make the UI a bit better. Check screenshot in temp/g1.jpeg, it's not aesthetically pleasing. I do like the minimalist last time, but perhaps make it a bit more elaborate but not cluttered.

UX - There is a "2" right next to handstand push which I can see is a counter. Check the same g1.jpeg for a reference. Maybe make it a bit more better giving feedback on what it means? 


**G2.** Type a number and save.

Expect: the set appears in a list immediately, the counter goes `1 / 3`, and you
feel a light haptic tick.

**Observed:**
FINE

**G3.** Use the `+` stepper. Tap it nine times, fast.

Expect: the field reads exactly 9 higher. This dropped taps once and was fixed —
worth re-checking on real hardware, which is faster than the emulator.

**Observed:**
FINE

**G4.** Log a set with the second metric left completely blank.

Expect: the set records, and reads back as just the one value — `9 reps`, never
`9 reps · 0 kg`. A blank field means *not recorded*, and must never become zero.

**Observed:**
FINE

**G5.** Log a set with **To failure** on.

Expect: the row says so.

**Observed:**
FINE 

**G6.** Keep logging until you hit the target — the third set.

Expect: a **different** haptic from the previous ones. Say whether you can
actually tell them apart on this device.

**Observed:**
It is a different one, yes.

**G7.** Log a fourth set, past the target.

Expect: it works. Nothing stops you, nothing scolds you, the counter reads
`4 / 3`.

**Observed:**
UX - It works,but see the previous G pointers, it's not instantly understandable on what it means. A better UX.

**G8.** Leave the screen idle for a couple of minutes without touching it.

Expect: the screen does not sleep during a session.

**Observed:**
FINE.

---

## H. Correcting mistakes

**H1.** Tap a logged set.

Expect: it expands into the same fields that created it.

**Observed:**
FINE

**H2.** Change a value and save.

**Observed:**
FINE

**H3.** Edit a set where you left a metric blank, and this time fill it in.

Expect: it saves, and the row now shows both values.

**Observed:**
FINE

**H4.** Toggle **To failure** on an existing set and save.

**Observed:**
FINE

**H5.** Delete a set from the middle.

Expect: a confirmation, then the sets below renumber to close the gap — no gap
in the set indexes.

**Observed:**
FINE

**H6.** Add a note to the exercise entry.

Expect: it saves without a save button, and survives leaving and returning.

**Observed:**
FINE

---

## I. Targets during a session

**I1.** On an exercise entry, override the target — change it to something
different from the template.

Expect: this session's target changes.

**Observed:**
FINE

**I2.** Now go to the template and look at that slot.

Expect: **unchanged.** A bad night must never silently rewrite the program.

**Observed:**
FINE

---

## J. Session lifecycle

**J1.** Pause the session.

**Observed:**
FINE

**J2.** Resume it.

Expect: you are asked, or it resumes cleanly — either way nothing is lost.

**Observed:**
FINE

**J3.** Complete the session.

**Observed:**
FINE

**J4.** Start a **second** session from the same template.

Expect: `Last time` now shows the numbers from the session you just finished.
And the target is the **template's** target — not the override from I1.

**Observed:**
FINE


**J5.** With that session running, edit the template slot's target to something
obviously different, like 42 × 99. Return to the session.

Expect: the running session keeps the target it started with. Targets are
snapshotted at session start.

**Observed:**
FINE

**J6.** Discard a session you do not want.

Expect: a confirmation, and it is gone from Home.

**Observed:**
FINE

---

## K. Never lose a set

This is the invariant the whole app exists for. Take it seriously.

**K1.** Start a session, open an exercise, type a value, save the set — then
**immediately** swipe the app out of recents. As fast as you can, within a
second of the tap.

Expect: reopen the app, and the set is there.

*This is the one thing that could not be verified automatically. `adb shell
input tap` returns when the tap is injected, not when the app has handled it, so
a scripted kill lands before React has dispatched anything and proves nothing.
It needs a human thumb.*

**Observed:**
FINE, it's working. 

**K2.** Repeat K1 three or four more times, varying how fast you kill it.

**Observed:**
FINE. Repeated at varying speed, nothing lost. Invariant 1 is verified by a
human thumb, which is the only way it could be.

**K3.** Turn on airplane mode and use the app normally for a few minutes.

Expect: no difference whatsoever. There are no network calls anywhere.

**Observed:**
FINE

---

## L. Feel and finish

Less structured. Use the app as though you were actually training and answer
these honestly.

**L1.** Could you log a set without looking carefully — tired, mid-set, one
hand?

**Observed:**

**L2.** Is anything too small to hit reliably? Everything tappable should be at
least 48×48.

**Observed:**
Fine for now. Interface refinement is deferred until the app is functionally
complete — L2 through L6 are answered on that basis, not because each was
audited.

**L3.** Does any screen feel cramped, or conversely too spread out?

**Observed:**
Fine for now — see L2.

**L4.** The accent colour should appear in exactly three places in the whole
app: the primary action button, a new-record marker, and filled dots in the
seven-day row — the last two do not exist yet. Did you see it anywhere else?

**Observed:**
Fine for now — see L2. Not audited element by element.

**L5.** How many taps from opening the app to logging your first set? Count
them.

**Observed:**
3 taps, 1 -> start session, 2 -> start one exercise, 3 -> tap it and save.

**L6.** Anything you expected to be able to do and could not?

**Observed:**
Nothing outstanding. Everything raised during the smoke test was either fixed in
the Phase 4 follow-ups or is scheduled — completion flow and quick log are
Phase 6.

**L7.** Anything that annoyed you that has no section above?

**Observed:**

---

## Summary

Fill this in at the end, once you have been through everything.

**Worst thing about the app right now:**
- Not worst, but I'd like to work on this a bit more. Dropdowns and suggestions for C1/C2, should have dropdown or tablets at the bottom? User can filter through and if they don't exist, option to create and select at that time. I would rather not go back to creating a new unit or family in a different screen, then get back here to selet that. Further, this avoids any and all typos like push ups and Push Ups, etc for family and reps,Reps, REPS for units. As much as possible, minimize user typing and give options. This does not obviously hold for Exercise names since they could be unique. And Notes. Family could also be unique, so user types once and then selects from it. 

- UX - Can we swipe left/right to move between tabs? It's cosmetic, but perhaps a tiny horizontal line which moves as we move along the tabs? It could be animated. Not a priority, jut looking at options.

- UX - family should NOT underscore in the placeholder, currently it has front_level. No. No underscores anywhere.

- BUG - If I click on Save Set in a session without logging anything, no "To Failure" nothing, it just says recorded in the logged ones. Is that expected? Perhaps we could grey out the Save Set unless I add a rep.

- UX - The resume session looks kind of ugly on the home. Id like to make it look a bit better. Check temp/resume_session.jpeg under project root.

**Best thing:**
- I like when archive shows only if there are any archives and we navigate there. Doesn't clutter the screen.

**Anything that should block Phase 5:**
- NOTE - If the UI cosmetic changes are going to be done later on, if you recommend we do that later on, it's fine. Like the resume_session.jpeg image or any of the UI changes, we can defer them to a later stage. I am still not a 100% happy with how the application looks, but I'm keeping an emphasis on application functionality slightly more than UI/UX for now. I am open to suggestions, recommendations from you.

---

# Phase 6 device pass — completion flow & quick log

Not part of the walkthrough above. These are the three Definition-of-Done items
Phase 6 closes, plus the two edge cases that decide whether the target raise is
trustworthy. **Phase 6 does not close until these pass.**

Everything below needs a **cold start** first — migration 0005 runs when the
root mounts, and Fast Refresh does not remount the root.

## M. Finishing a session

**M1 — DoD 6.** Start a session from a template with at least two exercises. Log
sets against one and **nothing at all** against the other. Tap `Finish session`.

Expect: a `Not trained` line naming the untrained exercise, in grey — never red,
never a dialog. `Finish session` sits right below it and works in one tap.

**Observed:**

UX - Not trained does appear but it's literally a list. I need to read through it one by one, it's a comma seaparated list. Perhaps we could display it as an actual list or something which makes it easier to look through? 

**M2.** In the same review, type a session note, then force-quit before tapping
Finish. Reopen, resume, finish again.

Expect: the note is still there. It is written as you type, not on the button.

**Observed:**

It's there, that's working. 

**M3.** An exercise short of its target — 2 of 3 sets — must **not** be warned
about. Cutting a set on purpose is normal.

**Observed:**
It's there, that's working. 

## N. Raising a target

**N1 — DoD 7.** Template target `3 × 8 reps`. Log 10, 10, 9. Finish.

Expect: `Pull-Up — you hit 10 reps against a target of 8 reps.` and a
`Raise to 10 reps` button. One tap and the row says it is raised.

Then check the **template** reads `3 × 10 reps`, and the **completed session**
still reads `3 × 8` — history does not move.

**Observed:**
This is a nice touch and yes, it's working. 

**N2.** Same target of 8, but log 10, 7, 6 — beaten once out of three.

Expect: **no prompt.** A majority means more than half.

**Observed:**
- Working

**N3.** Log 8, 8, 8 against a target of 8.

Expect: **no prompt.** A tie is not a beat.

**Observed:**
Worked

**N4 — the raise must never lower.** Template target 12. Start the session, tap
the target and override it down to 8 for this session. Log 10, 10, 10. Finish.

Expect: **no prompt.** You beat what you trained against, but the template still
says 12 and writing 10 would cut the program.

**Observed:**
Worked

**N5.** Put the same exercise in one template **twice** with different targets —
say `3 × 8` to open and `2 × 5` to finish. Beat the first and not the second.

Expect: only the opener is offered, and raising it leaves the finisher at 5.
This is the case the whole phase was built around.

**Observed:**

Working

## O. Quick log

**O1 — DoD 8.** From Home, with no session running, tap `Quick log`, search for
Pull-Up, enter 5, tap `Log it`.

Expect: it saves and returns. No session screen ever appears.

**Observed:**
- Working

**O2.** Start a session, leave it running, and quick-log something else.

Expect: it works, and Home still offers to resume the session. A quick log is
not a session.

**Observed:**
- Working

**O3.** Open Quick log, choose an exercise, then tap Back.

Expect: back to the exercise list, not off the screen.

**Observed:**

BUG - Quick log -> choose exercise -> back takes me back to the homescreen, not the exercise list screen.

**O4.** With an exercise chosen and nothing typed, `Log it` is disabled until a
value is entered or `To failure` is on.

**Observed:**
- Working

---

# Phase 6a device pass — leaving a screen

Sections M to O are closed. These cover what changed in 6a.

**Already verified on device, no need to re-check:** the slot screen end to end
(system back raises the prompt; Cancel keeps the draft; Discard writes nothing;
Save writes and navigates; a clean exit does not prompt), and the add screen's
`Done`.

**Know this before testing:** the **first** system back press is eaten by the
keyboard, as it is in any Android app. The guard sees the second. A first press
that seems to do nothing is the keyboard closing, not a bug.

## P. The exercise editor

**P1.** Exercises → an exercise → Edit. Change the name, then press the system
back.

Expect: `Save your changes?` — Save, Discard, Cancel.

**Observed:**

- Working

**P2.** On the same screen, rename a **metric** below and press the system back
without tapping its `Save name`.

Expect: the same prompt. A rename is work typed and not kept, and the screen's
guard is meant to know about it.

**Observed:**

- Working

**P3.** Add a metric, then press back **without** touching any field.

Expect: **no prompt** — adding already wrote. The metric list ends in `Done`.

**Observed:**

- Working
**P4.** Does `Save details` still look like it owns the metric list below it?

**Observed:**
No

## Q. Confirmations

**Q1.** Exercises → an exercise → Archive.

Expect: a confirmation, matching Delete beside it. Same for Unarchive.

**Observed:**

- Working
**Q2.** A template's name — change it and press back.

Expect: the prompt. The name is a draft; Start session, Add and Delete are not.

**Observed:**

- Working
## R. Quick log

**R1.** Quick log → choose an exercise → type a value → **system back**.

Expect: the prompt, and Discard returns to the **exercise list**, not Home.
This is smoke test O3, which was the bug.

**Observed:**
- Working

**R2.** Quick log → choose an exercise → type nothing → system back.

Expect: straight back to the exercise list, no prompt.

**Observed:**
- Working

## S. Training still writes as you type

The exception in `FEATURES.md` §18. If either of these prompts, the exception
has been broken.

**S1.** In a session, open an exercise, type a note, force-quit, reopen.

Expect: the note is there. **No prompt on leaving** — it was never a draft.

**Observed:**
- Working

**S2.** Finish a session, type a session note, force-quit before tapping Finish,
reopen and resume.

Expect: the note is there.

**Observed:**
- Working

---

# Phase 7 device pass — History

**Already verified by script, no need to re-check:** the timeline renders and
groups by day; quick logs are titled with their exercise and marked `Quick log`;
the five most recent sessions' durations match
`completed_at − started_at − accumulated_pause_ms` exactly against the pulled
database; the detail screen shows date, duration, name, every set per exercise,
`Not trained` for an exercise with none, and the note field.

**Know this before testing:** the Expo dev menu opens on a hardware MENU press
and sits over the app, swallowing the next tap. If a tap seems to do nothing,
press Back once and try again. It is the dev client, not the app.

## T. Reading a session back

**T1 — exit criterion 1.** Quick-log an exercise with **two** metrics — Push-Up
records Reps and Hold — filling only one of them. Open it from History.

Expect: the set reads `10 reps · —`, not `10 reps`. The dash is the difference
between a value you left out and one you never had.

**Observed:**
Reported as failing, but observed on the History **timeline** rather than on a
session opened from it — the timeline row says `Quick log · 1 exercise` by
design and never shows a set. The dash was working: `w1.jpeg` shows `21 20 · —`
on the exercise screen, and both renderers passed `missing: '—'`.

**Superseded by Phase 8a.** The dash said something was missing without saying
what, so both reading surfaces now name it — `10 reps · hold not recorded`.
Re-run against that wording, on a session opened from the timeline.

**T2.** Compare a session in History against what you remember logging. Sets in
order, correct values, `to failure` where you marked it, per-exercise notes
present.

**Observed:**
- This is fine, working

**T3 — exit criterion 2.** Start a session, log a set, **pause it for a minute
or two**, resume, log another set, finish. Open it from History.

Expect: the duration excludes the pause. A session you spent 5 minutes in with 2
of those paused reads about `3m`, not `5m`.

**Observed:**
This is fine as well

## U. Editing and deleting

**U1.** Open a session from History, change its name, press the system back.

Expect: the §18 prompt — Save, Discard, Cancel.

**Observed:**
This is fine as well

**U2.** Tap an exercise inside a completed session.

Expect: its sets, editable and deletable — **and no logging UI at all.** No
`Save set`, no timer. §7.3 grants correcting a set after a session, not adding
to one.

**Observed:**
This is fine as well

**U3.** Correct a set from there, go back.

Expect: the session detail shows the corrected value.

**Observed:**
This is fine as well

**U4.** Delete a session from its detail screen.

Expect: a confirmation, then it is gone from the timeline. Check the Exercises
tab still lists everything it used, and that another session containing the same
exercise is untouched.

**Observed:**
This is fine as well

**U5.** A quick log opened from History.

Expect: no Name field — it never had one — but the note and delete still work.

**Observed:**
This is fine as well

## V. What history must not do

**V1.** Open an exercise from a session finished days ago and leave the screen
sitting for a couple of minutes without touching it.

Expect: the display times out normally. Keep-awake is for training, not reading.

**Observed:**
This is fine as well


**V2.** Anything in History that reads as zero where nothing was recorded?

Expect: nothing. `—` for a missing value, `Not trained` for an exercise with no
sets. Never `0`.

**Observed:**
This is fine as well

## W. One exercise, across everything

**W1 — exit criterion 1, DoD 10.** Exercises → an exercise you have actually
trained, say Pull-Up.

Expect: `Records`, then `Metrics`, then `History` — every set ever logged,
newest session first, each session headed by its date and name. Sets within a
session read in the order you did them.

**Observed:**
Pass — but the line was unreadable, and three defects were behind it.

`21 20 · —` was a value of **21** against a metric **named `20`**, then Reps
unrecorded. `formatMeasure` appended `unit ?? name`, so a numeric metric name
came out as a second numeral. Fixed in Phase 8a:

1. The records row printed the metric name twice — once as its label, once
   inside the figure. It takes a bare value now.
2. The dash never said which metric it stood for. Both reading surfaces name it.
3. A set that measured nothing read `— · —` rather than saying an effort
   happened; the `Recorded` fallback had become unreachable.

A fourth, older one surfaced while fixing the third: a note lives in
`value_text` and every caller built its map from `value_num`, so a written note
always looked unrecorded here. Notes now render on their own line.

**W2 — the record marker.** Find the best set in the History list.

Expect: it says `Record`, in the accent colour, and the same figure appears in
the `Records` section above with that session's date. One record per metric —
a Reps record and a Hold record are separate and may sit in different sessions.

**Observed:**
- This is fine

**W3 — ties.** Log a set equalling your best for that exercise, then reopen the
screen.

Expect: the record's **date does not move**. Matching your best is not beating
it, and the marker stays on the older set.

**Observed:**
- This is fine

**W4 — nulls.** An exercise with two metrics where you filled only one.

Expect: `10 reps · —` in the History list, and no record at all for the metric
you left empty. Never a record of `0`.

**Observed:**
Pass, once decoded — Reps held no values and so held no record, which is exactly
what this checks. No record of `0` anywhere. The confusion was the presentation,
recorded under W1 and fixed in Phase 8a.

**W5 — quick logs count.** Quick-log an exercise, then open it from Exercises.

Expect: the quick log appears in History headed `Quick log`, and it can hold a
record. §11.5 keeps quick logs out of the *sessions* figure on the dashboard,
not out of the record.

**Observed:**
- This is fine.

**W6 — a correction reaches the record.** From the exercise's History, tap a
session header, open the exercise inside it, and edit the set holding the
record downward. Go back twice.

Expect: the record has moved to whatever is now the best set. Nothing is stored,
so nothing can be stale.

**Observed:**
Fine

**W7 — an exercise never trained.** Open one from the Suggested list.

Expect: `Nothing logged yet`, no `Records` section at all, and the metric
configuration still shown. No zeros anywhere.

**Observed:**
Fine

**W8 — the list is long.** Scroll an exercise with a lot of history.

Expect: smooth. The list is virtualized; the name, records and metrics scroll
away with it rather than sitting fixed.

**Observed:**
Fine

## X. Reading a set back, after Phase 8a

Everything here is presentation. W already proved the ranking is right; this
proves you can tell what it is saying.

**X1 — the name, once.** Open the exercise whose metric is named `20`.

Expect: `Records` reads `20 · 21 · Tue 11 Aug`. The name appears in the label
column and nowhere else. An exercise recording seconds reads `Hold · 42 s`,
keeping the unit — the label does not carry it.

**Observed:**
Fine

**X2 — the missing metric is named.** An exercise with two measured metrics
where you filled only one, in both the exercise screen's History and a session
opened from the timeline.

Expect: `21 · reps not recorded`, in both places, worded identically. Never a
bare dash, never `0`.

**Observed:**
Fine

**X3 — a set that measured nothing.** Find the set that read `— · —` under
`Pull Day`, or mark one to failure with every field empty.

Expect: `Recorded`. It happened; nothing was measured; that is the whole
statement.

**Observed:**
Fine

**X4 — a note is not a missing measurement.** Log a set with a note against an
exercise that records one, then read it back from both surfaces.

Expect: the figures on one line, the note beneath in smaller grey type. **Never
`notes not recorded` on a set that has one** — that was the trap in naming the
missing metric, since notes are stored in a different column from every figure.

**Observed:**
Fine — the bug this was written to catch is not present.

**X5 — a note that was never written.** The same exercise, a set with no note.

Expect: no second line at all. Not a dash — the value line above already
accounts for everything measured.

**Observed:**
Fine

**X6 — the button names the set.** Start a session, open an exercise with three
sets logged.

Expect: `Save set 4`. Log it and it reads `Save set 5`. Delete a set from the
list and it counts back down. It must never name a set number that already
exists.

**Observed:**
Fine — counts up on log and back down on delete.

**X7 — the button under a timer.** An exercise measured in seconds.

Expect: the hold timer is still the only action, with no second button beside
it. §7 gives the timer the write.

**Observed:**
Fine

## Y. One session, read back — after the Phase 8b refit

The first screen rebuilt to the design document (`zoomies_screen.pdf`, screen
8). Everything here is presentation over data Phase 8a already proved correct,
so a failure is a layout or a wording defect, not a fold.

Run every item **in both themes**. The document's claim is that light and dark
are the same design at two levels of ground — nothing moves and nothing is
recoloured — so anything that shifts between them is a defect.

**Y1 — the identity line.** History → a completed session with a name.

Expect: the **name** is the screen title, with `14 Aug · 18:42–19:30 · 48 min`
beneath it in mono. The date is no longer the title. A session that ran past
midnight still reads its two clock times correctly.

**Observed:**

**Y2 — a quick log.** Open one from the timeline.

Expect: the exercise's name as the title, a `ONE-OFF` tag beside it, and the
date alone on the metadata line — no time range and no duration. No Name field
anywhere on the screen.

**Observed:**

**Y3 — the target that day.** An exercise logged against a target.

Expect: `target that day · 4 × 9 reps`, right-aligned on the exercise's row.
Now **edit that template's target** and reopen the session: the line must not
move. This is invariant 5, and the wording is what makes it visible.

**Observed:**

**Y4 — an exercise that was planned and skipped.** A session where one exercise
logged nothing.

Expect: the name in lighter ink, and `Not trained · planned 3 × 12` beside it.
Never `0`, never an empty row.

**Observed:**

**Y5 — the set line.** A set carrying two values and a note.

Expect: `1` in a fixed column, then `31s · 12 reps` in mono, then the note
beneath it in prose. The indices count `1 2 3` — they are stored from zero, so
a set reading `0` is a defect. A set with ten or more still aligns.

**Observed:**

**Y6 — the two things a set can be missing.** A set with one metric unfilled,
and a set with nothing measured at all.

Expect: `42s · reps not recorded`, and `Recorded` for the second. Never a bare
dash, never a note reading as unrecorded.

**Observed:**

**Y7 — to failure.** A set marked to failure.

Expect: a bordered `TO FAILURE` tag after the figures, not the words trailing
the line as prose. It sits inline and wraps with the figures rather than pushing
them off the row.

**Observed:**

**Y8 — the foot.** Scroll to the bottom.

Expect: `Tap any set to correct it` on the left and a **bordered** `Delete` with
a red label on the right — no pink fill. Delete still confirms, still removes
the session from the timeline, and the exercise screen's record still updates.

**Observed:**

**Y9 — still a draft.** Type in the name, then press the Android system back.

Expect: the same Save · Discard · Cancel prompt as before, with Save disabled
until something changes. The refit did not touch §18; if this behaves
differently, the layout work reached something it should not have.

**Observed:**

**Y10 — the primary button, everywhere.** Any screen with one — Home, a
template, the completion review.

Expect: a solid black block with paper-coloured text in light, and a paper
block with dark text in dark. No moss anywhere in the application. The gutter
is the same 24 on every screen, and section gaps are visibly tighter than
before.

**Observed:**

## Z. The training screens, after the Phase 8b refit

The last group refit, and the only one holding invariant 1. **Nothing in the
write path changed** — `logSet`, `quickLog` and the hold timer are untouched —
so the point of this section is to prove that by exercising them, not to admire
the layout.

Run in **both themes**, and run Z1 before anything else.

**Z1 — a set still cannot be lost.** Log a set and force-stop the app from the
recents switcher as fast as you can, several times at different speeds. Relaunch.

Expect: every set is there. This is smoke test K2 repeated because the screen
around the button was rebuilt; the button's own code was not.

**Observed:**

**Z2 — the marks say what is left.** Open a session with a plan.

Expect: a filled mark per set done, an outline per set still to do. An exercise
with no target sets shows **no marks at all** — outlines against a number
nobody chose would invent a shortfall. Exceeding a target adds filled marks
rather than overflowing.

**Observed:**

**Z3 — the live row.** Look at which exercise is lifted onto the pale panel.

Expect: the first one still short of its target, held in **plan order** — it
must not jump to the top. Log its last set and the lift moves to the next
unfinished exercise. With the whole plan done, no row is lifted.

**Observed:**

**Z4 — the clock is wall time.** Note the elapsed figure, background the app for
about two minutes, come back.

Expect: it advanced by the real two minutes. Now **Pause**: the figure stops and
the line beneath says `paused`. Wait a minute, resume — the paused minute is not
counted. This is invariant 4 and the arithmetic is unit tested; what needs a
thumb is that the interval stops when paused.

**Observed:**

**Z5 — recording a set is still two taps.** Open a counted exercise from the
session.

Expect: the fields sit in a bar pinned to the bottom edge, above the keyboard
when one is up. `Record set 4` names the right set, counts up as you log and
back down if you delete one. The list above scrolls under it.

**Observed:**

**Z6 — a hold is not pinned.** Open a duration exercise.

Expect: the clock is in the body of the screen, large, with its one button — not
squeezed into a bottom bar. It still counts down from a target, still records at
zero, still survives locking the phone.

**Observed:**

**Z7 — the target still overrides for this session only.** Tap `Target today`,
change it, save.

Expect: the entry's figure changes; the plan does not. Go back to the plan
screen and confirm its target is untouched (§7.4).

**Observed:**

**Z8 — a logged set reads back.** Log one with two values and a note.

Expect: `1  31 s · 12 reps` with the note beneath, and a bordered `TO FAILURE`
tag where it applies. Tap it — the editor still opens, still saves, still
deletes.

**Observed:**

**Z9 — nothing offers to log a finished session.** From History, open a session
and tap into an exercise.

Expect: the set list and its editors, and **no logging bar and no clock**. §7.3
grants correcting a set after a session, not adding to one.

**Observed:**

**Z10 — the way out.** From a running session.

Expect: `Pause` and `End session` side by side under the clock, neither of them
filled. `Discard session` is at the foot of the list, far from both, and still
asks twice.

**Observed:**

---

## AA. Look back — Phase 9

The dashboard. Nothing here writes, so nothing here can lose a set — the risk is
the opposite one, that a figure is confidently wrong. Every check below is a
statement that could be false without looking false.

Run in **both themes**.

**AA1 — the way in.** Open History.

Expect: `Look back ›` beside the title, opening the dashboard. It is **not** a
fourth tab and it is **not** on Home — §11.3 keeps a review of the last quarter
away from the Start button. On a fresh install with nothing trained, the link is
absent entirely.

**Observed:**

**AA2 — the grid is a quarter wide and draws from your first session.** Read the
label, then look at the squares.

Expect: `DAYS TRAINED · <first day> – <today>`. The squares are small — thirteen
columns' worth — **whatever the history**, and they end flush with the right
gutter. Everything before your first logged day is blank: no outline, no fill,
just held-open space. This is the two-week case that shipped broken, with two
columns of squares the width of a thumb.

Once history runs past thirteen weeks nothing is blank on the left, and the
label starts at the first column drawn rather than at the first session ever.

**Observed:**

**AA2b — the month axis sits under its own months.** Read the axis, on a fresh
install and again with a few weeks of history.

Expect: the first label sits at the left edge of the month it names, and no
label appears over the blank leading columns. A blank span that does not match
the grid's walks every later label off by a column.

**Observed:**

**AA3 — a square is a day, not a session.** Find a day you trained twice, or
trained and also quick-logged.

Expect: one filled square, no darker than any other. There is no intensity
ramp — §11.1 rules out the combined volume figure one would have to be shaded
by.

**Observed:**

**AA4 — a day outside the record is blank, at both ends.** Look at the last
column, unless today is Sunday; then look at the first column drawn, unless you
first trained on a Monday.

Expect: every day from your first logged day to today carries a mark — filled or
outlined — and nothing else does. The last column is short at the bottom and the
first is short at the top. An outline at either end would say *skipped*, and
neither a Thursday that has not arrived nor a Tuesday before the app knew you
has been skipped.

**Observed:**

**AA5 — no streak anywhere.** Read the whole block.

Expect: no number attached to the grid, no highlighted current run, no marker
where a run broke, no flame, and nothing that changes when you miss a day beyond
that day's square being an outline. §11.6.

**Observed:**

**AA6 — a quick log is not a session.** Note both counts, then quick-log
something and come back.

Expect: the **quick logs** figure went up by one and the **sessions** figure did
not move. §11.5. Now finish an ad-hoc session with no plan: that one *does*
count as a session.

**Observed:**

**AA7 — the window tells the truth about young history.** On a fresh install
with a few days of training.

Expect: the captions read `since <date>`, not `last 28 days` — the app did not
exist for the other twenty-four days and must not report them as nothing. With
more than 28 days of history they read `last 28 days`.

**Observed:**

**AA8 — the neglect list is a fact, not a debt.** Read it.

Expect: longest gap first, each row `<name>` on the left and `6 May · 101 days`
on the right — the date is there so a movement you deliberately stopped reads as
something you decided. Nothing trained inside the last week appears at all. An
exercise you have **never** trained does not appear either: it has no last date,
and a number invented from when it was added would be a figure about the library
(invariant 2). Tapping a row opens that exercise.

**Observed:**

**AA9 — a record is something you beat.** Read the records block.

Expect: each row states the figure and, beneath it, `up from <previous> · <date>`
— the second line is what makes the first mean anything. The **first set of an
exercise never appears**: it is a baseline, not a record. Equalling a best does
not appear either, and the same rule §10.1 applies elsewhere holds here — the
earlier set keeps it.

**Observed:**

**AA10 — a correction reaches all four blocks.** From History, open an old
session and correct a set upward past its old best; go back to Look back.

Expect: the record appears or moves. Now delete every set of a day: that day's
square empties, the counts drop, and the exercise's gap in the neglect list
grows. Nothing on this screen is stored (invariant 3), and this is what that
means in practice.

**Observed:**

**AA11 — the empty states say what is missing.** On a fresh install, and again
on one with a week of training.

Expect: with nothing trained, one empty state and no grid — never an empty
quarter of outlines. With everything trained inside the last week, the neglect
list says so in a sentence rather than rendering as a blank space. With nothing
beaten yet, the records block says so and explains that a first set is a
starting point.

**Observed:**

**AA12 — nothing is celebrated and nothing moves.** Watch the screen open.

Expect: no confetti, no counting-up figures, no animated reveal, no exclamation
mark anywhere. Records are stated. §11.6, `DESIGN.md` §8.

**Observed:**

---

## AB. The timeline, ruled

Run in **both themes**. History tab, with at least a dozen entries in it,
including quick logs, multi-exercise sessions and a break of two or more days.

**AB1 — every row is separated.** Scroll the list.

Expect: a hairline under every row, at `rule-2` weight — light enough that a
dozen of them do not read as a grid. A rule under the `History` header too, at
the heavier `rule`.

**Observed:**

**AB2 — the rule stands down where something else already separates.** Find a
break with a `8–11 Aug · no training` rule in it, and scroll to the very bottom.

Expect: no row rule immediately above a gap rule, and none under the last row in
the list. A hairline directly above the gap's own two is a third line saying the
same thing; a hairline under the last row is a line in open space.

**Observed:**

**AB3 — no row wraps.** Find the session with the most exercises in it.

Expect: exactly two lines. The exercise names truncate with an ellipsis and the
set count stays visible at the end of the line — the total is the fact that must
survive, the names are the detail. Every quick log is exactly one line.

**Observed:**

**AB4 — the rules survive the dark.** Switch themes and read the list again.

Expect: the hairlines are visible but not bright. `rule-2` in dark is barely
above the ground on purpose; if the rows look boxed, it is the wrong token.

**Observed:**

---

## AC. Settings, export and appearance — Phase 10

Run the appearance checks in **both directions**, not both themes — the point is
that the override wins over the system and survives a relaunch.

**AC1 — the way in.** Open Home.

Expect: `Settings ›` on the title row, beside `Zoomies`. Not a gear, not a tab.

**Observed:**

**AC2 — the override applies on the tap.** Settings → Appearance → Dark, with
the phone in light mode.

Expect: the theme changes immediately, with no confirmation and no Save. A tick
moves to the chosen row and the other two carry no empty box.

**Observed:**

**AC3 — the override survives a force-quit, on the first frame.** With Dark
chosen and the phone in light mode, force-quit the app and reopen it.

Expect: it opens dark. **Watch the first frame specifically** — a flash of light
before it settles means the preference is being applied after a render rather
than before one, which is the defect this was built to avoid.

**Observed:**

**AC4 — System means system.** Choose System, then flip the phone's theme from
the system shade with the app open.

Expect: the app follows immediately, no relaunch. This is the pre-Phase-10
behaviour and must be unchanged.

**Observed:**

**AC5 — export produces a file and hands it over.** Settings → Export
everything.

Expect: the share sheet opens with a file named `zoomies-<today>.json`. Save it
somewhere you can open — a notes app, a file manager, your own email draft.
Underneath the button, a line like `9 exercises, 41 sets`.

**Observed:**

**AC6 — the file holds your training.** Open the saved file and read it.

Expect: readable JSON with `"format": "zoomies-export"`, a `version`, an
`exportedAt`, a `schemaVersion`, and a `tables` object. Find an exercise you
recognise by name, and a set you logged today.

**Observed:**

**AC7 — nothing is missing.** In the file, check the table list and one set.

Expect: nine tables — `exercise_entries`, `exercise_metrics`, `exercises`,
`meta`, `sessions`, `set_metric_values`, `sets`, `template_slots`, `templates`.
Find a set where you left one metric blank: its `set_metric_values` row must
show `"value_num": null`, **never** `0` and never a missing key. Invariant 2, in
the one file that exists to preserve it.

**Observed:**

**AC8 — deleted training is still in the backup.** Delete a session you do not
want, then export again and search the new file for it.

Expect: the session's row is present, with a non-null `deleted_at`. The
application hides it; the backup does not. If it is absent, a restore would
silently discard everything the user ever deleted.

**Observed:**

**AC9 — export works in airplane mode.** Turn on airplane mode and export again.

Expect: no difference whatsoever. There is no network call anywhere in the
application, and this is the check that says so.

**Observed:**

**AC10 — a second export the same day.** Export twice without changing the date.

Expect: it works both times. The filename is the date alone, so the second run
overwrites the first rather than failing on an existing path.

**Observed:**

**AC11 — leaving settings needs no guard.** Change the appearance, then press
Back, and separately the Android system back.

Expect: it leaves immediately both times, with no "unsaved changes" prompt.
Nothing on this screen is a draft (§18 Pattern B) — a prompt here would be
asking about work that was already committed.

**Observed:**
