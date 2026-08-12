import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * From `react-native-reusables`, restyled to DESIGN.md §6.1.
 *
 * Everything upstream is dropped except the shape: the `cva` variant map and
 * the `TextClassContext` that colours the label. Its classes could not survive
 * anyway — `bg-primary`, `h-10`, `rounded-md` and `shadow-sm` are not class
 * names in this project, because `tailwind.config.js` replaces Tailwind's
 * scales rather than extending them. The web-only branches went with them;
 * this app is iOS and Android.
 *
 * Four variants, and no `size`. The primary is taller and slightly rounder than
 * its siblings (§6.1) — it is the one thing on the screen a thumb goes to
 * without looking. Nothing drops below the §9 floor of 48.
 */
const buttonVariants = cva(
  'flex-row items-center justify-center gap-sm rounded-button px-lg transition duration-fast active:scale-press active:bg-muted',
  {
    variants: {
      variant: {
        /*
         * Solid ink, and the only filled block on its screen (§3.2). It
         * inverts on its own between themes — `text` is near-black on light
         * and near-white on dark — so this carries no theme conditional and
         * stays the brightest thing in a dark garage.
         */
        primary: 'h-primary w-full rounded-card bg-text',
        secondary: 'h-control self-start border border-border bg-surface',
        ghost: 'h-control self-start',
        danger: 'h-control self-start bg-danger-bg',
      },
    },
    defaultVariants: { variant: 'secondary' },
  },
);

const buttonTextVariants = cva('font-sans-semibold text-body', {
  variants: {
    variant: {
      // Paper on ink, which is the ground colour rather than a token of its
      // own — the fill is `text`, so its label is `bg`.
      primary: 'text-bg',
      secondary: 'text-text',
      ghost: 'text-text-2',
      danger: 'text-danger',
    },
  },
  defaultVariants: { variant: 'secondary' },
});

type ButtonProps = ComponentProps<typeof Pressable> &
  VariantProps<typeof buttonVariants>;

function Button({ className, variant, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant })}>
      <Pressable
        role="button"
        className={cn(
          buttonVariants({ variant }),
          props.disabled && 'opacity-50',
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
