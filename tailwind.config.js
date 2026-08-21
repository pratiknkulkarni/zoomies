/**
 * DESIGN.md is authoritative for every value in this file.
 *
 * The scales below are **replaced**, not extended. Tailwind's defaults are
 * removed so that out-of-system values do not exist as class names at all —
 * `p-5`, `text-red-500` and `rounded-lg` fail to compile rather than merely
 * being discouraged. If a value is needed and is not here, amend DESIGN.md
 * first.
 */

const withAlpha = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './features/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  // NativeWind toggles this class from the colour scheme, which follows the
  // system by default. The manual override in Phase 10 sets it explicitly.
  darkMode: 'class',
  theme: {
    // §3 — the only colours that exist. No pure black, and no accent: emphasis
    // is weight, rule and solid ink. `danger` is the single hue in the system
    // and reaches only delete and discard.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: withAlpha('--color-bg'),
      surface: withAlpha('--color-surface'),
      muted: withAlpha('--color-muted'),
      // Two weights of hairline. `border` edges a control the thumb can press;
      // `rule` and `rule-2` are structure and list separation, and are lighter
      // so a list of twenty rows does not read as a grid.
      border: withAlpha('--color-border'),
      rule: {
        DEFAULT: withAlpha('--color-rule'),
        2: withAlpha('--color-rule-2'),
      },
      // Five steps of ink, in the order they recede: text, prose, metadata,
      // section labels, set indices and the em dash for unrecorded.
      text: {
        DEFAULT: withAlpha('--color-text'),
        2: withAlpha('--color-text-2'),
        3: withAlpha('--color-text-3'),
        4: withAlpha('--color-text-4'),
        5: withAlpha('--color-text-5'),
      },
      // §6.11 — the unfilled set mark. Its own step because it inverts
      // relative to `border` between themes, so neither hairline can stand in.
      mark: withAlpha('--color-mark'),
      danger: withAlpha('--color-danger'),
    },

    // §4 — seven steps and no others. 24 is the screen gutter and is never
    // broken; 18 separates sections, 14 separates rows, 10 and below sit inside
    // a row, and 34 appears only above a new block on a sparse screen.
    spacing: {
      0: '0px',
      xs: '4px',
      sm: '6px',
      md: '10px',
      lg: '14px',
      xl: '18px',
      '2xl': '24px',
      '3xl': '34px',
    },

    // §5 — a control is tighter than the panel that holds it, which is tighter
    // than a sheet.
    borderRadius: {
      none: '0px',
      button: '10px',
      card: '12px',
      sheet: '22px',
      full: '9999px',
    },

    // §5 — depth is `surface` against `bg`. Nothing else.
    boxShadow: { none: 'none' },
    dropShadow: { none: 'none' },

    borderWidth: {
      0: '0px',
      DEFAULT: '1px',
      hairline: '1px',
    },

    // §2.3 — the type scale. Weight comes from the family (see fontFamily),
    // because React Native cannot synthesise a weight for a bundled face.
    // Line height 1.4 for headings and figures, 1.5 for prose.
    fontSize: {
      display: ['27px', { lineHeight: '38px' }],
      title: ['24px', { lineHeight: '34px' }],
      heading: ['19px', { lineHeight: '27px' }],
      body: ['16px', { lineHeight: '24px' }],
      bodySm: ['14px', { lineHeight: '21px' }],
      caption: ['13px', { lineHeight: '20px' }],
      label: ['11px', { lineHeight: '17px' }],
      // The running clock, and nothing else. Line height 1.125 rather than the
      // 1.4 the headings use: it is one line of figures with no ascender or
      // descender to clear, and 1.4 would put a 90px box around a 64px number.
      timer: ['64px', { lineHeight: '72px' }],
      metric: ['24px', { lineHeight: '34px' }],
      metricSm: ['16px', { lineHeight: '22px' }],
      metricXs: ['13px', { lineHeight: '18px' }],
    },

    // §2.1–2.2 — Geist for interface text, Geist Mono for every number.
    // Two weights only: 400 and 600. Names match the keys registered with
    // expo-font in app/_layout.tsx.
    fontFamily: {
      sans: ['Geist_400Regular'],
      'sans-semibold': ['Geist_600SemiBold'],
      mono: ['GeistMono_400Regular'],
      'mono-semibold': ['GeistMono_600SemiBold'],
    },

    // Deliberately empty. Weight is carried by the family above, so a
    // `font-weight` utility could only ask the platform to synthesise a face —
    // which is faux-bold on Android and the reason §2.2 ships two real cuts
    // instead. Removing the scale means `font-bold` does not compile.
    fontWeight: {},

    // §2.4 — the label treatment: 11px uppercase at 0.14em over text-4.
    letterSpacing: {
      normal: '0px',
      label: '1.54px',
    },

    // §7 — animation clarifies state; it never entertains.
    transitionDuration: {
      fast: '120ms',
      base: '200ms',
      slow: '320ms',
    },

    extend: {
      // Component sizes from §6 and §9. Not spacing, so they live apart from
      // the spacing scale — but still named, so no component reaches for an
      // arbitrary pixel value.
      height: {
        control: '56px', // secondary button, and the floor for any control
        primary: '62px', // the one primary action on a screen
        field: '56px', // numeric input
        // §6.3 — the timer's progress track. The same 1px as a border, but a
        // height rather than a border width, because the track is a filled
        // element and not an edge.
        hairline: '1px',
        // §6.14 — the best-set trend's plot. Tall enough that a session's dot
        // clears the one below it, short enough that `Every set` still starts
        // on the first screen.
        chart: '96px',
      },
      width: {
        // §6.2 — a stepper is square against the field it flanks. Larger than
        // the §9 floor on purpose: tapping one must never need precision.
        field: '56px',
        // §6.7 — the label column of a label-and-value row. Wide enough that
        // `Last time` sets on one line; `field` was borrowed for this and is
        // 6px short of it.
        label: '72px',
      },
      minHeight: {
        touch: '48px', // §9 — exceeds the platform minimum deliberately
        row: '56px', // §6.4 list row
        field: '56px', // §6.2 — the floor for a field that grows, e.g. notes
      },
      minWidth: {
        touch: '48px',
      },
      // §6.1 — the press feedback scale. Named rather than written inline so
      // `scale-[0.98]` never appears in a component.
      scale: {
        press: '0.98',
      },
    },
  },
  corePlugins: {
    // No italic face is bundled, so `italic` could only synthesise a slant.
    fontStyle: false,
  },
  plugins: [],
};
