import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Text } from '@/components/ui/text';
import { completeSession, setSessionNotes } from '@/db/mutations/sessions';
import { setSlotTarget } from '@/db/mutations/templates';
import {
  completionReview,
  type CompletionReview,
  type TargetRaise,
} from '@/db/queries/completion';
import { sessionById } from '@/db/queries/sessions';
import { formatMeasure } from '@/lib/format';

/**
 * The review between the last set and history (FEATURES.md §6.5, §6.6).
 *
 * Reached from `Finish session`, and from the resume prompt's `Complete it
 * now` — finishing without looking at what happened is how an exercise that
 * was never trained ends up in history indistinguishable from one that was.
 *
 * **Every decision here is written the moment it is made**, not gathered up and
 * applied by the final button. A raise is one tap and it is on disk; the note
 * is written as it is typed. The button at the bottom completes the session and
 * nothing else, so a force-quit anywhere on this screen loses at most the tap
 * that was mid-flight.
 *
 * A top-level route rather than `app/session/[id]/complete.tsx`, which would
 * mean moving the session screen into a directory — and Metro serves a stale
 * route tree after a route file moves, presenting as a blank screen with no
 * error.
 */
export default function CompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: found } = useLiveQuery(sessionById(id), [id]);
  const session = found.at(0);

  /**
   * Read once. The session is about to finish and nothing else is writing it,
   * so a live query would re-run the whole review on every keystroke in the
   * note — and would fight the raise rows, which manage their own state after
   * they are tapped.
   */
  const [review, setReview] = useState<CompletionReview | null>(null);

  useEffect(() => {
    let current = true;

    void completionReview(id).then((result) => {
      if (current) {
        setReview(result);
      }
    });

    return () => {
      current = false;
    };
  }, [id]);

  const finish = () => {
    void completeSession(id).then(() => router.dismissAll());
  };

  return (
    <Screen bleed>
      <ScrollView
        contentContainerClassName="pb-3xl"
        keyboardShouldPersistTaps="handled"
      >
        <BackButton />

        <Text className="px-xl pt-sm font-sans-semibold text-display text-text">
          Finish
        </Text>
        {session?.name ? (
          <Text className="px-xl pt-xs text-bodySm text-text-2">
            {session.name}
          </Text>
        ) : null}

        {review && review.untrained.length > 0 ? (
          <Untrained names={review.untrained.map((entry) => entry.name)} />
        ) : null}

        {review && review.raises.length > 0 ? (
          <View className="gap-md px-xl pt-2xl">
            <SectionLabel>Beaten</SectionLabel>
            {review.raises.map((raise) => (
              <RaiseRow key={raise.entryId} raise={raise} />
            ))}
          </View>
        ) : null}

        {session ? (
          <SessionNote key={id} sessionId={id} notes={session.notes} />
        ) : null}

        <View className="px-xl pt-2xl">
          <Button variant="primary" onPress={finish}>
            <Text>Finish session</Text>
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

/**
 * §6.5 — warn about exercises with **zero sets logged**, and only those. An
 * exercise merely short of its target was very likely cut on purpose.
 *
 * `text-2` and stated in a sentence, never `danger` and never a dialog. It is
 * information, and it is bypassable in one tap because Finish is right below it
 * and stays enabled — a modal asking permission to finish a session that is
 * already over would be asking the wrong question.
 */
function Untrained({ names }: { names: string[] }) {
  return (
    <View className="gap-sm px-xl pt-2xl">
      <SectionLabel>Not trained</SectionLabel>

      {/*
        A list, not a sentence. These were run together with commas, which meant
        reading a paragraph to find out which two of five exercises were missed
        — on the screen whose only job is to say exactly that.
      */}
      <View className="gap-xs">
        {names.map((name) => (
          <Text key={name} className="text-body text-text-2">
            {name}
          </Text>
        ))}
      </View>

      <Text className="text-bodySm text-text-2">
        {names.length === 1
          ? 'Nothing was logged against it. Finishing is fine — it reads as not trained, never as zeros.'
          : 'Nothing was logged against these. Finishing is fine — they read as not trained, never as zeros.'}
      </Text>
    </View>
  );
}

/**
 * §6.6 — one tap, and the template's target moves. This is the only mechanism
 * by which a target increases; there is no automatic progression.
 *
 * **Applied on tap, not on finish.** One tap means one tap, and it means the
 * decision is on disk the moment it is made rather than riding on a later
 * button. Ignoring the row changes nothing, which is the other half of the
 * rule.
 *
 * Local state rather than re-reading: the review is deliberately not live, and
 * the row already knows what it wrote.
 */
function RaiseRow({ raise }: { raise: TargetRaise }) {
  const [raised, setRaised] = useState(false);

  const apply = () => {
    // Metric and value are written together, as they always are — the pair is
    // meaningless apart. It is the same metric the slot already targets;
    // `completionReview` refuses to offer the raise otherwise.
    void setSlotTarget(raise.slotId, {
      metricId: raise.metricId,
      value: raise.best,
    }).then(() => setRaised(true));
  };

  return (
    <View className="gap-sm">
      <Text className="text-body text-text">
        {raise.name} — you hit {formatMeasure(raise.best, raise.metric)} against
        a target of {formatMeasure(raise.target, raise.metric)}.
      </Text>

      {raised ? (
        <Text className="text-bodySm text-text-2">
          Target raised to {formatMeasure(raise.best, raise.metric)}.
        </Text>
      ) : (
        <Button variant="secondary" onPress={apply}>
          <Text>Raise to {formatMeasure(raise.best, raise.metric)}</Text>
        </Button>
      )}
    </View>
  );
}

/**
 * One optional note for the session (§7.5), written as it is typed.
 *
 * Not on blur: `keyboardShouldPersistTaps="handled"` means a tap on Finish goes
 * straight to the button without dismissing the keyboard, so the field never
 * blurs and the note would be lost by the very action meant to save it. That
 * bug shipped once already, across six fields.
 *
 * Keyed by its caller on the session so it initialises from what is stored and
 * is never overwritten mid-sentence by the live query above.
 */
function SessionNote({
  sessionId,
  notes,
}: {
  sessionId: string;
  notes: string | null;
}) {
  const [draft, setDraft] = useState(notes ?? '');

  const change = (next: string) => {
    setDraft(next);

    const trimmed = next.trim();
    void setSessionNotes(sessionId, trimmed.length > 0 ? trimmed : null);
  };

  return (
    <View className="gap-xs px-xl pt-2xl">
      <SectionLabel>Note</SectionLabel>
      <Input
        value={draft}
        onChangeText={change}
        accessibilityLabel="Note for this session"
        placeholder="How the session went"
        multiline
        className="h-auto min-h-field py-md"
      />
    </View>
  );
}
