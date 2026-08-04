import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * `cn` merges class names so a `className` prop can override a component's own
 * classes predictably. In NativeWind, conflicting utilities resolve by
 * stylesheet order rather than by their order in the string, so the later
 * class does not simply win — the conflict has to be resolved before it
 * reaches the renderer.
 *
 * tailwind-merge ships knowing Tailwind's default scales, and
 * `tailwind.config.js` replaces every one of them. Unconfigured it would read
 * `text-display` as a colour, since that value is absent from its font-size
 * list, and drop it when merged against `text-text-2`. So each replaced scale
 * is restated below.
 *
 * These lists mirror `tailwind.config.js` and must be changed with it.
 */

const COLORS = [
  'bg',
  'surface',
  'muted',
  'border',
  'text',
  'text-2',
  'text-3',
  'accent',
  'accent-bg',
  'accent-fg',
  'danger',
  'danger-bg',
  'transparent',
  'current',
];

const SPACING = ['0', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];

const FONT_SIZES = [
  'display',
  'title',
  'heading',
  'body',
  'bodySm',
  'caption',
  'label',
  'metric',
  'metricSm',
  'metricXs',
];

const RADII = ['none', 'button', 'card', 'sheet', 'full'];

const FONT_FAMILIES = ['sans', 'sans-semibold', 'mono', 'mono-semibold'];

const twMerge = extendTailwindMerge({
  override: {
    classGroups: {
      'font-size': [{ text: FONT_SIZES }],
      'text-color': [{ text: COLORS }],
      'bg-color': [{ bg: COLORS }],
      'border-color': [{ border: COLORS }],
      'font-family': [{ font: FONT_FAMILIES }],
      rounded: [{ rounded: RADII }],
      p: [{ p: SPACING }],
      px: [{ px: SPACING }],
      py: [{ py: SPACING }],
      pt: [{ pt: SPACING }],
      pr: [{ pr: SPACING }],
      pb: [{ pb: SPACING }],
      pl: [{ pl: SPACING }],
      m: [{ m: SPACING }],
      mx: [{ mx: SPACING }],
      my: [{ my: SPACING }],
      mt: [{ mt: SPACING }],
      mr: [{ mr: SPACING }],
      mb: [{ mb: SPACING }],
      ml: [{ ml: SPACING }],
      gap: [{ gap: SPACING }],
      'gap-x': [{ 'gap-x': SPACING }],
      'gap-y': [{ 'gap-y': SPACING }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
