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
**Monochrome.** Hierarchy comes from **type scale**, not from colour. There is
no accent: emphasis is weight, rule and solid ink.

Light and dark are the same design at two levels of ground — nothing moves and
nothing is recoloured between them.

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
2. **Adding a colour is the change most likely to break this.** The system has
   one hue, `danger`, and it reaches two acts. Anything else is ink.
3. **Warm, not clinical.** Never pure `#000000`. `#FFFFFF` appears once per
   screen at most, as the single lifted plane.
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
| `display` | 27 | 600 | Geist | Screen title. **One per screen.** |
| `title` | 24 | 600 | Geist | Section headings, exercise names on detail screens |
| `heading` | 19 | 600 | Geist | Exercise name in a list, card headings |
| `body` | 16 | 400 | Geist | Body text, inputs, button labels (600) |
| `bodySm` | 14 | 400 | Geist | Targets, dates, explanatory sublines |
| `caption` | 13 | 400 | Geist | Tertiary text, timestamps |
| `label` | 11 | 400 | Geist | Uppercase letterspaced labels only |
| `metric` | 24 | 600 | Geist Mono | Primary numbers — hold time, set counts |
| `metricSm` | 16 | 400 | Geist Mono | Inline numbers — previous values, targets |
| `metricXs` | 13 | 400 | Geist Mono | Dense numeric lists |

Nothing below 11. Line height 1.4 for display and title, 1.5 for body.

**Sizes are added when a screen needs one, not in advance.** The larger figures
the training screens want — the counter, the running clock — arrive with those
screens, so an unused size cannot drift out of step with the thing it was for.

### 2.4 The Label Treatment

`label` is always uppercase, `letterSpacing: 0.14em`, colour `text-4`.

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

Eleven steps per theme: three grounds, five of ink, three of hairline.

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#F4F2EE` | `#131312` | Ground. Every screen. |
| `surface` | `#FFFFFF` | `#1E1E1B` | **The one lifted plane** — the live exercise row, the focused field |
| `muted` | `#EFECE7` | `#1A1A18` | Fixed bottom bars, callouts, input fills, pressed states |
| `text` | `#1A1917` | `#ECEAE5` | Text, filled set marks, the primary button's fill |
| `text-2` | `#4A4843` | `#B4B1AA` | Notes and secondary prose |
| `text-3` | `#6B6862` | `#918E86` | Metadata, targets, inactive tabs |
| `text-4` | `#8A877F` | `#79766F` | Section labels, completed exercises |
| `text-5` | `#A9A49A` | `#63615B` | Set indices, axis labels, the em dash for unrecorded |
| `border` | `#C9C4B9` | `#3B3A36` | Control borders |
| `rule` | `#DCD8D0` | `#2B2A27` | Structural rules — header, footer |
| `rule-2` | `#E6E2DA` | `#232220` | List rules |

Warm off-white and warm near-black. Never pure black.

**`surface` appears at most once on a screen.** It is what marks the one live
row or the one focused field; two of them and neither reads as live. Everything
else that looks raised is `muted`.

**Two weights of hairline, and they are not interchangeable.** `border` edges a
control a thumb can press. `rule` and `rule-2` are structure and list
separation, and are lighter — a list of twenty rows separated at `border`
weight reads as a grid.

### 3.2 Destructive — the only hue

| Token | Light | Dark |
|---|---|---|
| `danger` | `#B4443A` | `#D97A6E` |
| `danger-bg` | `#F7EBE9` | `#2E1F1D` |

Delete confirmations and discard actions only. Never for warnings, and never for
the untrained-exercise prompt at session completion — that is informational, and
uses `text-2`.

**There is no accent colour**, and adding one is the change most likely to break
this design. Moss was defined and spent in three places — the primary button,
the record marker, the dashboard's day dots — and all three read better as ink:
the button as a solid block that inverts between themes, the marker as weight,
the dots as filled versus outline. A record is stated like any other fact, which
is what `FEATURES.md` §15 asked for and what a coloured marker quietly argued
against.

### 3.3 Charts

Charts use `text` at 100% for the primary series and `rule` for the baseline.
Dots and bars are ink. Nothing in a chart is coloured, because nothing anywhere
is.

---

## 4. Spacing

**Only these values**: `4 · 6 · 10 · 14 · 18 · 24 · 34`.

| Token | Value | What it separates |
|---|---|---|
| `xs` | 4 | Inside a row |
| `sm` | 6 | Inside a row |
| `md` | 10 | Inside a row |
| `lg` | 14 | One row from the next |
| `xl` | 18 | One section from the next |
| `2xl` | 24 | **The screen gutter. Never broken.** |
| `3xl` | 34 | Above a new block, on a sparse screen only |

Restricting the scale is what makes layouts look deliberate. Arbitrary values
are what make them look accidental. Never use one.

**The gutter is `2xl`, not `xl`.** The names are ordinal and the roles are not:
24 is the widest value in ordinary use because it is the horizontal margin, and
sections sit closer together than that at 18. Reading `px-2xl` as "wider than a
section gap" is correct.

---

## 5. Shape

| Element | Token | Radius |
|---|---|---|
| Buttons, inputs, chips | `button` | 10 |
| Cards, panels, the primary button | `card` | 12 |
| Bottom sheet top corners | `sheet` | 22 |
| Pills, dots, avatars | `full` | — |

A control is tighter than the panel that holds it. The primary button takes the
panel radius rather than the control one — it is a block, not a control among
others.

**No shadows.** Depth comes from `surface` against `bg`. A hairline `border`
where separation is genuinely needed. No elevation, no blur, no glow.

---

## 6. Components

Base primitives come from `react-native-reusables`, copied into
`components/ui/` and edited freely. Library defaults are a starting point, not
the design system — every primitive is restyled to these tokens on the way in.

### 6.1 Button

| Variant | Fill | Border | Text | Height | Use |
|---|---|---|---|---|---|
| `primary` | `text` | none | `bg` | 62 | The one main action per screen |
| `secondary` | `surface` | `border` | `text` | 56 | Everything else |
| `ghost` | none | none | `text-2` | 56 | Tertiary, inline |
| `danger` | `danger-bg` | none | `danger` | 56 | Delete, discard |

**The primary is solid ink and inverts on its own.** `text` is near-black on
light and near-white on dark, so a fill of `text` with a `bg` label is a black
block by day and the brightest thing on the screen at night — with no theme
conditional anywhere. It is the only filled block on its screen.

Full-width on primary actions; auto-width otherwise. Press feedback is
`scale(0.98)` plus `muted` fill, 120ms.

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
when inactive — carried by ink depth and label weight together, never by one
alone (§9).

**No illustration in v1.** Per-exercise doodles were considered and are cut, not
deferred. Reintroducing them would be a design decision requiring an amendment
here, not a backlog item.

---

## 9. Accessibility

- Minimum touch target **48×48**. This exceeds the platform 44pt minimum
  deliberately — the app is used with tired hands. Named controls go larger
  still: 56 for a secondary button, 62 for the primary.
- Body text contrast at least 4.5:1; `text-4` and `text-5` are used only for
  labels, set indices and axis marks, never for anything that must be read.
- **No information is conveyed by colour, because there is none.** Every state
  in the system is filled versus outline, or one weight against another.
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
6. **A screen says how it is left.** `FEATURES.md` §18 makes every writing
   screen either a draft or a set of immediate actions; the difference is
   carried by the action row at the foot of the section it belongs to. A draft
   ends in `Discard` and `Save`, side by side and equal width, `secondary` then
   `primary`. An action surface ends in a single full-width `secondary` `Done`.
   Neither is ever a bare icon.

   **The row belongs to its section, not to the screen.** A screen holding one
   drafted field among immediate actions puts that field's `Save` directly
   beneath the field. Placed at the foot of the screen it reads as owning
   everything above it, which is how a `Save` came to sit under a list that had
   already written itself.

   **A row whose content scrolls past the screen is pinned.** `Done` on the
   add-exercise screen sat below every exercise in the library, so finishing
   meant scrolling the whole list to reach it. Pinned rows go in `Screen`'s
   `footer`, which places them above the safe area and inside the keyboard
   avoider, separated from the content by a hairline. A short screen does not
   pin — the space costs more than the scroll saves.

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
| Aug 2026 | Phase 8b, from the second design run (`zoomies_screen.pdf`). **The accent is deleted.** All three of its sanctioned uses read better as ink, and a coloured record marker argued against `FEATURES.md` §15's "stated, not congratulated" while claiming to honour it. `danger` survives as the only hue and reaches two acts. The neutral ramp goes from seven steps to eleven — `text-4`, `text-5`, `rule` and `rule-2` — so a section label, a set index and a list rule stop borrowing tokens meant for something else. Spacing becomes `4 · 6 · 10 · 14 · 18 · 24 · 34`, which moves the screen gutter from `xl` to `2xl`; the names stayed ordinal so the swap was mechanical. Type: `display` 32→27, `heading` 18→19, label tracking 0.08em→0.14em. Radii tighten to 10 / 12 / 22. The primary button becomes solid `text` with a `bg` label, which inverts between themes with no conditional. Geist stays — the document specifies Libre Franklin and IBM Plex Mono, and the difference at these sizes did not justify two font packages and a re-check that no frame renders in a fallback face. |
