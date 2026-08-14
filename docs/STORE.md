# Store Submission

**Project:** Zoomies
**Document Type:** Checklist and prepared answers
**Status:** Working document for Phase 11 — not a source of truth

Everything here is written out so that a submission form is filled in by
copying rather than by deciding at the keyboard. `TECH_STACK.md` §10 holds the
requirements; this holds the answers.

---

## 1. Blocked on a human, not on code

None of these can be finished from inside the repository, and all three are
past the start-by dates in `PLAN.md` §3.

| Item | Blocker | Note |
|---|---|---|
| Privacy policy URL | Needs hosting | Text is written — `docs/PRIVACY.md`. Replace `CONTACT_EMAIL_HERE` first. Gitea Pages, a static host, or a gist all satisfy "publicly accessible URL". |
| Google Play closed test | 12 opted-in testers, 14 continuous days | The longest pole on the Android timeline. Applies to personal accounts created after 13 Nov 2023. The clock does not start until the track is open **and** twelve testers have opted in. |
| Apple Developer Program | Paid membership, days to approve | Nothing iOS-side can be submitted or even signed without it. |

---

## 2. Data Safety — Google Play

The whole form, as it should be answered:

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **No** |
| Is all of the user data collected by your app encrypted in transit? | N/A — nothing is transmitted |
| Do you provide a way for users to request that their data is deleted? | N/A — no data leaves the device. Deleting the app, or *Clear storage*, removes everything |

**Nothing is declared** because nothing is collected. No SDKs, no advertising
identifier, no crash reporting, no analytics. The export feature does not
change this: the file is written locally and handed to a destination the user
picks, which is a user action rather than collection by the application.

**Data collection is about what leaves the device**, not about what the app
writes down. Training history stored only in the app's own database is not
collected data, and declaring it as such would be wrong in the other direction.

---

## 3. App Privacy — Apple App Store

| Question | Answer |
|---|---|
| Do you or your third-party partners collect data from this app? | **No** |

That single answer is the whole disclosure and produces a **Data Not Collected**
label. There are no third-party partners, because there are no third-party
SDKs.

**Account deletion requirement:** not applicable. The requirement applies to
apps that support account creation; this one has no accounts.

---

## 4. Content and ratings

- **Age rating:** general. No user-generated content, no social features, no
  purchases, no ads, no web views, no external links.
- **Category:** Health & Fitness.
- **In-app purchases:** none. **Ads:** none. **Subscriptions:** none.
- **Third-party sign-in:** none — which is why Apple's Sign in with Apple
  requirement is not triggered (`TECH_STACK.md` §11).

---

## 5. Listing copy

**Name:** Zoomies

**Short description** (Play, 80 characters):

> A calisthenics and rings journal that works with no account and no internet.

**Full description:**

> Zoomies is a training journal for calisthenics and rings work. It exists for
> one reason: sets get forgotten or missed when you are tired mid-session.
>
> Build a template, start a session, and log sets as you do them — with last
> session's numbers already on screen so you know what you are chasing. Hold
> timers run from timestamps, so backgrounding the app to answer a message
> costs you nothing. Everything is written to the device the instant you enter
> it; force-quitting mid-session loses nothing.
>
> Afterwards, look back: every set a movement has ever recorded, its personal
> bests, a dot per session showing where it is going, and a grid of the days
> you trained.
>
> There is no account, no sign-up, and no internet connection. Nothing is sent
> anywhere, because there is nowhere to send it — the app works exactly the same
> in airplane mode as it does anywhere else. Your whole history exports to a
> plain JSON file whenever you want it.
>
> No streaks, no badges, no congratulations, no coaching. It records what you
> did.

**Keywords (App Store, 100 characters):**

> calisthenics,rings,gymnastics,bodyweight,workout,training,log,journal,offline,sets,reps,hold

---

## 6. Screenshots

`DESIGN.md` §12.4's remaining open item, and the one piece of this that still
needs a decision rather than a form filled in.

Needed: Play requires at least two; the App Store requires a set per device size
that is being submitted for. Both accept plain device captures.

The five worth taking, in order — they are the product's argument, in sequence:

1. **An active session mid-exercise**, with a target visible and last session's
   numbers beside the field. This is the app.
2. **The hold timer running.**
3. **Session complete**, with the untrained-exercise prompt or the target-raise
   prompt showing.
4. **An exercise screen**, with the bests pair, the trend and the first rows of
   `Every set`.
5. **Look back**, with the day grid across a real quarter.

Take them in **both themes** and pick one set; do not mix. Use a device with
enough history that no screen is empty — the same database section AD needs.

---

## 7. Build

```bash
eas build --profile preview    --platform android --local   # apk, for the device
eas build --profile production --platform android --local   # aab, for Play
eas build --profile production --platform ios     --local   # needs §1's membership
```

`eas.json` already carries all three profiles. `appVersionSource` is `local`, so
`app.json`'s `version` is authoritative and `production` auto-increments the
build number beneath it.

**Verify on the installed preview build, not in the dev client**, at least for
section AD13 — the splash is native configuration and does not exist in Expo Go.
