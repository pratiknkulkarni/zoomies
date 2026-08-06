# Design System

**Project:** Zoomies
**Document Type:** Visual Source of Truth
**Status:** Authoritative — supersedes all prior visual decisions
**Last Updated:** August 2026
**Companion Documents:** `TECH_STACK.md`, `FEATURES.md`

---

## 0. Status of This Document

This document is the **single source of truth for visual design**.

It supersedes the visual content of `reuirements_two.md` §29 (Visual Design
Principles) and `fitness_app_readme.md` (*Design Philosophy*, *Visual
Direction*). The **UX** guidance in `reuirements_two.md` §28 and §30 remains
valid and is not restated.

Every value here is a token. **No component hardcodes a colour, radius, spacing
or font size.**

---

## 1. Direction

**Quiet editorial.**

Swiss typographic discipline, softened by rounded geometry and warm neutrals.
Near-monochrome. Hierarchy comes from **type scale**, not from colour. A single
muted accent, used in about three places in the entire application.

The reference set was: a monochrome workout form, a monochrome calendar, a
black-and-white habit tracker, and a line-art onboarding flow. What they share
is extreme scale contrast — tiny uppercase letterspaced labels beneath large
bold headings — a lot of air, rounded rectangles and pills as the only geometry,
and effectively no colour.

### 1.1 What This Is Not

Rejected: glassmorphism, gradients, sage-and-cream wellness aesthetics,
photographic or 3D-rendered imagery, and the terminal/brutalist direction from
`requirements_one.md` §3.

### 1.2 Principles

1. **Type does the work.** If a hierarchy needs colour to be legible, the type
   scale is wrong.
2. **The accent is rare.** Three uses. A fourth needs a reason.
3. **Warm, not clinical.** Never pure `#FFFFFF` or pure `#000000`.
4. **Space before borders.** Separate with whitespace first; add a hairline only
   when whitespace is not enough.
5. **Animation clarifies state.** It never entertains. (`reuirements_two.md`
   DD-068)
6. **Legible with tired hands in low light at 5 AM.** This overrides elegance
   wherever the two conflict.

---

## 2. Typography

### 2.1 Families

**Geist** — all interface text.
**Geist Mono** — all numeric display.

Both OFL, bundled as static weights via `expo-font`. Not loaded from a network.

**Why a bundled font:** this direction is almost entirely typographic. SF Pro on
iOS and Roboto on Android would not produce it, and would produce two different
apps. This is the one place a custom font earns its bundle size.

**Why the mono for numbers:** the application is read as columns of figures —
`8 · 8 · 7 · 6`, `42s`, `2 / 4`. Proportional figures make those columns jitter.
`fontVariant: ['tabular-nums']` is reliable on iOS but inconsistent on Android,
so a mono sidesteps the problem rather than depending on a font feature. It also
reads as deliberate rather than defaulted.

### 2.2 Weights

**Two only: 400 and 600.** No 300, no 500, no 700.

Restricting to two is what produces the crispness in the references. A third
weight makes hierarchy mushy.

### 2.3 Scale

| Token | Size | Weight | Family | Use |
|---|---|---|---|---|
| `display` | 32 | 600 | Geist | Screen titles, the one big number on a screen |
| `title` | 24 | 600 | Geist | Section headings, exercise names on detail screens |
| `heading` | 18 | 600 | Geist | Card headings, exercise names in lists |
| `body` | 16 | 400 | Geist | Body text, inputs |
| `bodySm` | 14 | 400 | Geist | Secondary text, list metadata |
| `caption` | 13 | 400 | Geist | Tertiary text, timestamps |
| `label` | 11 | 400 | Geist | Uppercase letterspaced labels only |
| `metric` | 24 | 600 | Geist Mono | Primary numbers — hold time, set counts |
| `metricSm` | 16 | 400 | Geist Mono | Inline numbers — previous values, targets |
| `metricXs` | 13 | 400 | Geist Mono | Dense numeric lists |

Nothing below 11. Line height 1.4 for display and title, 1.5 for body.

### 2.4 The Label Treatment

`label` is always uppercase, `letterSpacing: 0.08em`, colour `text-3`.

```
RING SUPPORT HOLD
42s
```

This pairing — 11px uppercase tertiary above a 24px mono figure — **is** the
Family A look. It is the most important single pattern in the system.

### 2.5 Casing

Sentence case everywhere except the `label` style. Never Title Case. No
exclamation marks. Exercise names keep their own capitalisation
(`Front Lever (Tuck)`).

---

## 3. Colour

Defined as CSS variables in `global.css`, mapped in `tailwind.config.js`. Both
themes are always defined; system setting is followed by default with a manual
override in settings.

### 3.1 Neutrals

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#FAFAF8` | `#0F0F0E` | Screen background |
| `surface` | `#FFFFFF` | `#1A1A18` | Cards, sheets, elevated rows |
| `muted` | `#F1F0EC` | `#252523` | Input fills, pressed states, inactive chips |
| `border` | `#E3E2DC` | `#33322F` | Hairlines, dividers |
| `text` | `#1A1A17` | `#F4F3EE` | Primary text, numbers |
| `text-2` | `#6B6A62` | `#A3A298` | Secondary text, units, previous values |
| `text-3` | `#9C9B92` | `#6E6D65` | Labels, placeholders, disabled |

Warm off-white and warm near-black. Never pure white or pure black.

### 3.2 Accent — Moss

| Token | Light | Dark |
|---|---|---|
| `accent` | `#55684F` | `#8CA285` |
| `accent-bg` | `#EDF0EA` | `#2A322A` |
| `accent-fg` | `#FAFAF8` | `#0F0F0E` |

`accent-fg` is text sitting **on** an accent fill.

**Chosen over ochre** because ochre sits close to the amber every fitness app
uses for streaks and calories, and would read as generic. Moss carries the sage
lineage from the warmer references without importing the wellness aesthetic, and
holds as the only saturated thing on the screen.

### 3.3 Accent Usage — Exactly Three Places

1. The primary action button on a screen (Start session, Save set, Finish)
2. The new-record marker
3. Filled dots in the seven-day row on the dashboard

Nothing else. Not headings, not icons, not active tabs, not the completion
counter, not chart bars. A fourth use requires amending this document.

Only one accent-filled element may be visible at a time. Sibling actions are
bordered or text-only.

### 3.4 Destructive

| Token | Light | Dark |
|---|---|---|
| `danger` | `#B4443A` | `#D97A6E` |
| `danger-bg` | `#F7EBE9` | `#2E1F1D` |

Delete confirmations and discard actions only. Never for warnings, and never for
the untrained-exercise prompt at session completion — that is informational, and
uses `text-2`.

### 3.5 Charts

Charts use `text` at 100% for the primary series and `border` for the baseline.
Bars are neutral. The accent does not appear in charts.

---

## 4. Spacing

4pt base, but **only these values**: `4 · 8 · 12 · 16 · 24 · 32 · 48`.

| Token | Value |
|---|---|
| `xs` | 4 |
| `sm` | 8 |
| `md` | 12 |
| `lg` | 16 |
| `xl` | 24 |
| `2xl` | 32 |
| `3xl` | 48 |

Restricting the scale is what makes layouts look deliberate. Arbitrary values —
`18`, `22`, `30` — are what make them look accidental. Never use one.

**Defaults:** screen horizontal padding `xl` (24). Card padding `lg` (16).
Gap between list rows `md` (12). Gap between sections `2xl` (32).

---

## 5. Shape

| Element | Radius |
|---|---|
| Cards, sheets | 16 |
| Buttons, inputs, chips | 12 |
| Pills, dots, avatars | full |
| Bottom sheet top corners | 24 |

Larger than typical, matching the rounded geometry of the references.

**No shadows.** Depth comes from `surface` against `bg`. A hairline `border`
where separation is genuinely needed. No elevation, no blur, no glow.

---

## 6. Components

Base primitives come from `react-native-reusables`, copied into
`components/ui/` and edited freely. Library defaults are a starting point, not
the design system — every primitive is restyled to these tokens on the way in.

### 6.1 Button

| Variant | Fill | Border | Text | Use |
|---|---|---|---|---|
| `primary` | `accent` | none | `accent-fg` | The one main action per screen |
| `secondary` | `surface` | `border` | `text` | Everything else |
| `ghost` | none | none | `text-2` | Tertiary, inline |
| `danger` | `danger-bg` | none | `danger` | Delete, discard |

Height 48. Radius 12. Full-width on primary actions; auto-width otherwise.
Press feedback is `scale(0.98)` plus `muted` fill, 120ms.

### 6.2 Numeric Input

Large. `metric` type, height 56, `muted` fill, radius 12, centred figure with
the unit in `text-2` beside it. Stepper controls flanking it for reps — tapping
a stepper must never require precision.

### 6.3 Timer

The single largest element on its screen. `display` size in Geist Mono. Tap
target is the whole card, not a button inside it. State is conveyed by the
figure and a hairline progress track — never by colour change.

### 6.4 List Row

Minimum height 56. `heading` for the exercise name, `caption` in `text-2` for
metadata, `metricSm` right-aligned for the `2 / 4` counter. Hairline separator
between rows, not cards — dense lists use bordered rows.

### 6.5 Empty States

One `heading` line naming the space, one `bodySm` line in `text-2`, one
`secondary` button. No illustration. No apology. Never "Nothing here yet."

### 6.6 Picker Sheet

For choosing one of a growing list of short values — an exercise's family, a
metric's unit. Rises from the bottom, `bg` fill, `sheet` radius on the top two
corners only, over a scrim of `text` at 40%.

Contents in order: the §2.4 label, a search field, the options as `body` rows at
the §9 touch minimum with a hairline between them, and a `secondary` Cancel. The
chosen row is marked by weight and a check, never by colour alone (§9).

**The field that opens it is not a text input.** It is a `control`-height row in
`muted` showing the current value with a chevron. Typing happens only inside the
sheet, only to filter, and creating a new value takes a deliberate press — free
text is what lets `push up` and `Push-Up` both exist.

A wrapping row of chips was tried first. It does not survive a list that grows.

### 6.7 Label-and-Value Row

The §2.4 pairing as a row: a fixed 72px label column in `caption` over `text-3`,
the value filling the rest. The column is fixed so that stacked rows align down
a common edge; 72 is the width at which `Last time` sets on one line.

Do not borrow the 56px numeric-field width for this. It is 6px short, which
wraps the label rather than clipping it — a failure that looks like a choice.

### 6.8 Placeholders

An input's placeholder describes what to type. It is never `—`.

`—` means **not recorded** and belongs to display surfaces alone — a logged set
missing a value, an exercise with no family. Putting it in an empty input claims
a value was withheld rather than that one is awaited, and in the numeric field it
also puts a third dash-shaped glyph between two stepper buttons.

A placeholder must set on one line at 360dp. A multiline `TextInput` is sized by
its content and not by its placeholder, so a second line is clipped rather than
grown into.

---

## 7. Motion

| Token | Duration |
|---|---|
| `fast` | 120ms |
| `base` | 200ms |
| `slow` | 320ms |

Easing: `ease-out` for entrances, `ease-in-out` for transitions.

Animate only: press feedback, sheet presentation, list insertion and removal,
timer progress.

Never animate: numbers counting up, celebration, screen transitions beyond the
navigator default, anything on the dashboard.

Respect `prefers-reduced-motion`; fall back to instant.

---

## 8. Iconography

`lucide-react-native`, 20px inline / 24px standalone, stroke width 1.5, colour
`text-2`. Sparse — an icon appears only where a word would be slower to read.

Tab bar icons are the primary exception and use `text` when active, `text-3`
when inactive. **Not the accent.**

**No illustration in v1.** Per-exercise doodles were considered and are cut, not
deferred. Reintroducing them would be a design decision requiring an amendment
here, not a backlog item.

---

## 9. Accessibility

- Minimum touch target **48×48**. This exceeds the platform 44pt minimum
  deliberately — the app is used with tired hands.
- Body text contrast at least 4.5:1; `text-3` on `bg` is used only for
  non-essential labels.
- No information conveyed by colour alone. The seven-day row uses filled versus
  hollow dots, not two colours.
- Respect system font scaling up to 200%. The `metric` styles may cap earlier to
  preserve numeric alignment.

---

## 10. Screen Composition Rules

1. **One `display` element per screen.** Two large numbers competing means
   neither is the answer.
2. **One `primary` button per screen.**
3. **Section = label + content.** An 11px uppercase `text-3` label above; the
   content below at its natural size.
4. **The active session screen carries the least chrome of any screen.** No
   header actions, no tab bar, no decorative elements. The exercise list and the
   counters, nothing else.
5. **Nothing on the dashboard is celebratory.** Records are stated, not
   congratulated.

---

## 11. Implementation

Tokens live as CSS variables in `global.css` and are mapped in
`tailwind.config.js`. Components consume Tailwind class names only.

```
NEVER  style={{ color: '#1A1A17' }}
NEVER  className="text-[#1A1A17]"
ALWAYS className="text-text"
```

Fonts load via `expo-font` in the root layout, with the splash screen held until
loaded so no frame renders in a fallback face.

Theme switching flips a class on the root; every token has a dark value, so no
component contains a conditional.

---

## 12. Open

- Icon and adaptive icon artwork
- Splash screen — likely the wordmark in Geist 600 on `bg`, nothing else
- Store screenshot treatment

---

## 13. Change Log

| Date | Change |
|---|---|
| Aug 2026 | Created. Direction: quiet editorial. Geist + Geist Mono. Moss accent. Full token set defined. Per-exercise doodles cut. |
