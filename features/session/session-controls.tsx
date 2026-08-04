import { router } from 'expo-router';
import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  completeSession,
  discardSession,
  pauseSession,
  resumeSession,
} from '@/db/mutations/sessions';
import type { Session } from '@/db/queries/sessions';

/**
 * Discarding throws away entries, sets and values for good — the one genuine
 * delete in the app. §6.3 requires a second confirmation, and this is it.
 */
function confirmDiscard(session: Session, after: () => void) {
  Alert.alert(
    `Discard ${session.name ?? 'this session'}?`,
    'Everything logged in it is deleted. This cannot be undone.',
    [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => void discardSession(session.id).then(after),
      },
    ],
  );
}

/**
 * The launch prompt of FEATURES.md §6.3: **Resume · Complete it now ·
 * Discard.**
 *
 * There is deliberately no "save and start a new one". An in-progress session
 * is either finished or thrown away, because §6.2 allows one at a time and a
 * half-finished session left lying around is how history stops being trusted.
 */
export function ResumePrompt({ session }: { session: Session }) {
  return (
    <View className="gap-md">
      <Button
        variant="primary"
        onPress={() =>
          router.push({ pathname: '/session/[id]', params: { id: session.id } })
        }
      >
        <Text>Resume {session.name ?? 'session'}</Text>
      </Button>

      <View className="flex-row gap-md">
        <View className="flex-1">
          <Button
            variant="secondary"
            className="w-full"
            onPress={() => void completeSession(session.id)}
          >
            <Text>Complete it now</Text>
          </Button>
        </View>
        <View className="flex-1">
          <Button
            variant="danger"
            className="w-full"
            onPress={() => confirmDiscard(session, () => {})}
          >
            <Text>Discard</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}

/**
 * What a session offers while it is open: pausing, and finishing.
 *
 * **Pausing is explicit and never automatic** (§6.2). Leaving the application
 * is not pausing — session state lives in SQLite, so switching apps changes
 * nothing and the elapsed time stays honest without anyone touching this.
 */
export function SessionControls({ session }: { session: Session }) {
  const paused = session.pausedAt !== null;

  return (
    <View className="gap-md px-xl pt-2xl">
      <Button
        variant="secondary"
        className="w-full"
        onPress={() =>
          void (paused ? resumeSession(session.id) : pauseSession(session.id))
        }
      >
        <Text>{paused ? 'Resume training' : 'Pause'}</Text>
      </Button>

      <Button
        variant="primary"
        onPress={() => void completeSession(session.id).then(() => router.back())}
      >
        <Text>Finish session</Text>
      </Button>

      <Button
        variant="danger"
        className="w-full"
        onPress={() => confirmDiscard(session, () => router.back())}
      >
        <Text>Discard session</Text>
      </Button>
    </View>
  );
}
