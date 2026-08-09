import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Alert, BackHandler } from 'react-native';

/**
 * Guards the ways off a screen whose edits are held in memory (FEATURES.md
 * §18, Pattern A).
 *
 * **A draft screen is only safe if every exit is covered, so one hook owns them
 * all.** A screen that guarded its own Back button and forgot the system one
 * would lose work in exactly the way this exists to prevent, and the failure
 * would be invisible until it happened.
 *
 * There are exactly two exits, and the small number is not luck:
 *
 * 1. `components/ui/back-button.tsx`, which is ours. Draft screens pass
 *    `requestExit` to its `onPress`.
 * 2. The Android system back. `app/_layout.tsx` sets `headerShown: false`, so
 *    no native header back button exists anywhere; native-stack has no
 *    swipe-back gesture on Android, that option being iOS-only; and
 *    `AndroidManifest.xml` sets `enableOnBackInvokedCallback="false"`, so
 *    predictive back is off and the legacy `BackHandler` API is authoritative.
 *
 * `usePreventRemove` would be the React Navigation answer, but expo-router
 * vendors its navigation core and does not re-export it, so reaching it means
 * importing from `expo-router/build/...` — a path into build output that a
 * patch release may move. `BackHandler` and `useFocusEffect` are both public
 * and do the same job here.
 *
 * **This is for planning surfaces only.** Anything typed during training keeps
 * writing as it is typed — see §18's exception, and invariant 1.
 */
export function useDraftExit({
  dirty,
  onSave,
  onDiscard,
  onLeave,
}: {
  /** True once the fields differ from what is stored. */
  dirty: boolean;
  /** Writes the draft. Awaited, so the row lands before the screen goes. */
  onSave: () => void | Promise<void>;
  /** Restores the fields to what is stored. Nothing was written, so this is
   *  local state only — there is no database work to undo. */
  onDiscard?: () => void;
  /**
   * Where leaving goes. Defaults to popping the route.
   *
   * Quick log needs this: its two steps live on one route, so leaving the
   * fields means returning to the exercise list rather than off the screen.
   * Without it here, the system back would keep doing something different from
   * the button — which is the bug this hook exists to close.
   */
  onLeave?: () => void;
}): { requestExit: () => void; saveAndLeave: () => void } {
  /**
   * The handler is registered once per focus, so it would otherwise close over
   * whichever `dirty` was current at registration and never see another. A ref
   * read at press time keeps the listener stable and the answer fresh.
   */
  const latest = useRef({ dirty, onSave, onDiscard, onLeave });
  latest.current = { dirty, onSave, onDiscard, onLeave };

  const leave = useCallback(() => {
    const go = latest.current.onLeave;

    if (go) {
      go();
    } else {
      router.back();
    }
  }, []);

  /**
   * What the Save button does: write, then leave. The await is the point — the
   * row lands before the screen goes, which is the ordering every mutation in
   * this app is called with, and it means a force-quit between tapping Save and
   * the screen changing cannot lose the edit.
   */
  const saveAndLeave = useCallback(() => {
    void Promise.resolve(latest.current.onSave()).then(leave);
  }, [leave]);

  const requestExit = useCallback(() => {
    const { dirty: unsaved, onDiscard: discard } = latest.current;

    if (!unsaved) {
      leave();
      return;
    }

    Alert.alert('Save your changes?', 'Nothing here has been written yet.', [
      // Order matters on Android, where buttons read left to right: the
      // destructive one is furthest from the thumb's resting side.
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          discard?.();
          leave();
        },
      },
      { text: 'Save', onPress: saveAndLeave },
    ]);
  }, [leave, saveAndLeave]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          // Returning false hands the press back to the system, which pops the
          // screen itself. Only a dirty screen swallows it.
          if (!latest.current.dirty) {
            return false;
          }

          requestExit();
          return true;
        },
      );

      // Removed on blur, so a screen underneath this one never eats a back
      // press meant for the screen on top.
      return () => subscription.remove();
    }, [requestExit]),
  );

  return { requestExit, saveAndLeave };
}
