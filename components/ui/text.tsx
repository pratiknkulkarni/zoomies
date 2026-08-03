import { createContext, useContext, type ComponentProps } from 'react';
import { Text as RNText } from 'react-native';

import { cn } from '@/lib/utils';

/**
 * Lets a parent set the classes of the text inside it — the reason `Button`
 * can colour its own label without the caller passing anything.
 */
const TextClassContext = createContext<string | undefined>(undefined);

/**
 * From `react-native-reusables`, reduced to what this app uses.
 *
 * The upstream component carries a variant list mirroring shadcn's web type
 * scale (`h1`, `lead`, `blockquote`). Ours is DESIGN.md §2.3, applied as
 * explicit classes at each call site, so the list is dropped rather than
 * translated — two competing type scales is worse than none. `asChild` goes
 * with it, which is what pulled in `@rn-primitives/slot`.
 */
function Text({ className, ...props }: ComponentProps<typeof RNText>) {
  const textClass = useContext(TextClassContext);

  return (
    <RNText
      className={cn('font-sans text-body text-text', textClass, className)}
      {...props}
    />
  );
}

export { Text, TextClassContext };
