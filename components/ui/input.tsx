import type { ComponentProps } from 'react';
import { TextInput } from 'react-native';

import { cn } from '@/lib/utils';

/**
 * From `react-native-reusables`, restyled.
 *
 * A text field, not the numeric input of DESIGN.md §6.2 — that one is 56 tall
 * with a centred figure and flanking steppers, and belongs to the logging UI
 * in Phase 4. This is the field for a name or a note: button height, `muted`
 * fill, matching radius.
 */
function Input({ className, ...props }: ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      className={cn(
        'h-control w-full rounded-button bg-muted px-lg font-sans text-body text-text placeholder:text-text-3',
        props.editable === false && 'opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
