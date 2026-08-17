import { View } from 'react-native';

/**
 * One small rectangle per set: filled for done, outlined for still to do
 * (DESIGN.md §6.11).
 *
 * **The thing you read from the floor.** Mid-session the question is what is
 * left, and a row of marks answers it without reading a number — which matters
 * because the counter beside it is small and you are looking at the phone from
 * arm's length with chalk on your hands.
 *
 * Filled versus outlined, never two colours: §9 forbids state carried by colour
 * alone, and there is no second colour in the system to carry it with.
 *
 * **Absent entirely when there is no target.** A plan can say "as many as you
 * do" (§5.1), and outlines drawn against a number nobody chose would invent a
 * shortfall — the counter shows the completed figure alone in that case.
 *
 * Exceeding a target is fine (§6.5), so extra sets add filled marks rather than
 * being dropped or drawn as an overflow.
 */
export function SetMarks({
  done,
  target,
  muted = false,
}: {
  done: number;
  /** Null means the plan asked for no particular number. Draws nothing. */
  target: number | null;
  /** For an exercise already complete — the row has nothing left to say. */
  muted?: boolean;
}) {
  if (target === null) {
    return null;
  }

  const total = Math.max(done, target);

  return (
    <View
      className="flex-row flex-wrap gap-xs"
      accessibilityLabel={`${done} of ${target} sets`}
    >
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          className={
            index < done
              ? muted
                ? 'h-md w-lg rounded-none bg-text-5'
                : 'h-md w-lg rounded-none bg-text'
              : 'h-md w-lg rounded-none border border-mark'
          }
        />
      ))}
    </View>
  );
}
