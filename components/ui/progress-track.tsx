import { View } from 'react-native';

/**
 * The hairline progress track of §6.3 — a filled fraction of a bar, no
 * colour change. Shared by the hold timer and the session header (§7.1's
 * session-total progress), the two places that show a fraction of a whole
 * rather than a per-set mark (`SetMarks`, §6.11).
 *
 * The width is a runtime fraction, so it is an inline style rather than a
 * token — the same exemption `components/ui/screen.tsx` documents for
 * safe-area insets. Everything else about it, the hairline height included,
 * is tokened.
 */
export function ProgressTrack({ progress }: { progress: number }) {
  return (
    <View className="h-hairline w-full bg-muted">
      <View
        className="h-hairline bg-text-3"
        style={{ width: `${Math.min(1, progress) * 100}%` }}
      />
    </View>
  );
}
