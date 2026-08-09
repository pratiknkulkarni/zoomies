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
