import type { ReactNode } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
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
 *
 * **Keyboard avoidance lives here rather than on each screen.** The manifest
 * sets `windowSoftInputMode="adjustResize"`, but `app.json` also enables
 * edge-to-edge, and from Android 15 the system stops resizing the window for an
 * edge-to-edge app — so `adjustResize` is inert and a plain `ScrollView` never
 * learns the keyboard is there. The add-a-metric form sat entirely underneath
 * it. Doing this once means a screen added later cannot forget.
 *
 * Harmless on a screen with no text input: with no keyboard up this measures
 * and lays out exactly as the `View` it replaces.
 */
export function Screen({ children, bleed = false }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior="padding"
      className={bleed ? 'flex-1 bg-bg' : 'flex-1 bg-bg px-xl'}
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-1">{children}</View>
    </KeyboardAvoidingView>
  );
}
