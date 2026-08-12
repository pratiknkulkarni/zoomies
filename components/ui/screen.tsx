import type { ReactNode } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  /** Drop the default horizontal padding for full-bleed content such as lists. */
  bleed?: boolean;
  /**
   * An action row pinned to the bottom, outside whatever scrolls above it.
   *
   * For a screen whose content outruns the display. `Done` on the add-exercise
   * screen sat at the foot of the library, so finishing meant scrolling past
   * every exercise to reach it — which is the "press Back and hope" problem
   * moved rather than solved.
   */
  footer?: ReactNode;
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
export function Screen({ children, bleed = false, footer }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior="padding"
      className={bleed ? 'flex-1 bg-bg' : 'flex-1 bg-bg px-2xl'}
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-1">{children}</View>

      {/*
        Inside the KeyboardAvoidingView and below the content, so a pinned row
        rises with the keyboard instead of hiding behind it.

        The inset goes on the outer view and the token padding on the inner: a
        `style` `paddingBottom` would override the class, and the two are
        different kinds of value. `insets.bottom` is device geometry read at
        runtime and carries the same exemption as `paddingTop` above.
      */}
      {footer ? (
        <View
          className="border-t border-border bg-bg"
          style={{ paddingBottom: insets.bottom }}
        >
          <View className={bleed ? 'px-2xl py-md' : 'py-md'}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
