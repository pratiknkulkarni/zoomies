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
    // §3 — the only colours that exist. No pure white, no pure black.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: withAlpha('--color-bg'),
      surface: withAlpha('--color-surface'),
      muted: withAlpha('--color-muted'),
      border: withAlpha('--color-border'),
      text: {
        DEFAULT: withAlpha('--color-text'),
        2: withAlpha('--color-text-2'),
        3: withAlpha('--color-text-3'),
      },
      accent: {
        DEFAULT: withAlpha('--color-accent'),
        bg: withAlpha('--color-accent-bg'),
        fg: withAlpha('--color-accent-fg'),
      },
      danger: {
        DEFAULT: withAlpha('--color-danger'),
        bg: withAlpha('--color-danger-bg'),
      },
    },

    // §4 — 4pt base, but only these seven steps. Arbitrary values are what
    // make a layout look accidental.
    spacing: {
      0: '0px',
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
      '2xl': '32px',
      '3xl': '48px',
    },

    // §5 — larger than typical, matching the rounded geometry of the
    // reference set.
    borderRadius: {
      none: '0px',
      button: '12px',
      card: '16px',
      sheet: '24px',
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
      display: ['32px', { lineHeight: '45px' }],
      title: ['24px', { lineHeight: '34px' }],
      heading: ['18px', { lineHeight: '25px' }],
      body: ['16px', { lineHeight: '24px' }],
      bodySm: ['14px', { lineHeight: '21px' }],
      caption: ['13px', { lineHeight: '20px' }],
      label: ['11px', { lineHeight: '17px' }],
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

    // §2.4 — the label treatment: 11px uppercase at 0.08em over text-3.
    letterSpacing: {
      normal: '0px',
      label: '0.88px',
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
        control: '48px', // button
        field: '56px', // numeric input
      },
      minHeight: {
        touch: '48px', // §9 — exceeds the platform minimum deliberately
        row: '56px', // §6.4 list row
      },
      minWidth: {
        touch: '48px',
      },
    },
  },
  corePlugins: {
    // No italic face is bundled, so `italic` could only synthesise a slant.
    fontStyle: false,
  },
  plugins: [],
};
