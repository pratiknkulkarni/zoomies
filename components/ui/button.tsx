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
 * Four variants, and no `size`. Height is 48 everywhere — §9 sets that floor
 * for tired hands, and a smaller button would breach it.
 */
const buttonVariants = cva(
  'h-control flex-row items-center justify-center gap-sm rounded-button px-lg transition duration-fast active:scale-press active:bg-muted',
  {
    variants: {
      variant: {
        // §3.3 — one of exactly three places the accent may appear, and only
        // one such element may be on screen at a time.
        primary: 'w-full bg-accent',
        secondary: 'self-start border border-border bg-surface',
        ghost: 'self-start',
        danger: 'self-start bg-danger-bg',
      },
    },
    defaultVariants: { variant: 'secondary' },
  },
);

const buttonTextVariants = cva('font-sans-semibold text-body', {
  variants: {
    variant: {
      primary: 'text-accent-fg',
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
