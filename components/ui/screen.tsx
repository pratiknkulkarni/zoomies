import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  /** Drop the default horizontal padding for full-bleed content such as lists. */
  bleed?: boolean;
};

/**
 * Screen background and the default horizontal padding of `xl` (DESIGN.md §4).
 *
 * The top inset is applied as an inline style because it is device geometry
 * read at runtime, not a design value — there is no token for it.
 */
export function Screen({ children, bleed = false }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={bleed ? 'flex-1 bg-bg' : 'flex-1 bg-bg px-xl'}
      style={{ paddingTop: insets.top }}
    >
      {children}
    </View>
  );
}
