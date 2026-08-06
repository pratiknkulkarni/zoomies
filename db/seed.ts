import { eq } from 'drizzle-orm';

import { db } from './client';
import { exerciseMetrics, exercises, meta } from './schema';

/**
 * The built-in catalogue, planted on first launch — not by a migration.
 *
 * Guarded by a flag row in `meta` so it runs exactly once. That is what lets a
 * built-in the user deleted stay deleted, and lets the catalogue grow later
 * without a schema change (TECH_STACK.md §4.5).
 */
const SEED_KEY = 'seed.catalogue';
const SEED_VERSION = '1';

type SeedMetric = {
  name: string;
  type: 'number' | 'duration' | 'notes';
  unit: string;
};

/** Reps first means reps is the primary metric and drives the logging UI. */
const REPS: SeedMetric = { name: 'Reps', type: 'number', unit: 'reps' };
/** Added load — weight on top of bodyweight, never absolute. */
const LOAD: SeedMetric = { name: 'Added load', type: 'number', unit: 'kg' };
const HOLD: SeedMetric = { name: 'Hold', type: 'duration', unit: 's' };

type SeedExercise = {
  name: string;
  family: string;
  isActive: boolean;
  metrics: SeedMetric[];
};

/**
 * Active entries are FEATURES.md §3.2 verbatim. The dormant ones exist so the
 * family-driven Suggested section has somewhere to point in Phase 2 — they
 * cost nothing until activated.
 *
 * Progression level is part of the name, never a tracked dimension: a tuck PR
 * and a full PR are not the same achievement (§3.1).
 *
 * This is a starting set, not the complete catalogue. Compiling that is
 * deferred (§14) and needs no schema change when it happens.
 */
const CATALOGUE: SeedExercise[] = [
  // pull_up
  { name: 'Pull-Up', family: 'Pull-up', isActive: true, metrics: [REPS, LOAD] },
  { name: 'Chin-Up', family: 'Pull-up', isActive: true, metrics: [REPS, LOAD] },
  {
    name: 'Archer Pull-Up',
    family: 'Pull-up',
    isActive: false,
    metrics: [REPS],
  },
  {
    name: 'One-Arm Pull-Up (Assisted)',
    family: 'Pull-up',
    isActive: false,
    metrics: [REPS],
  },
  { name: 'Muscle-Up', family: 'Pull-up', isActive: false, metrics: [REPS] },

  // row
  { name: 'Ring Row', family: 'Row', isActive: true, metrics: [REPS] },
  {
    name: 'Ring Row (Feet Elevated)',
    family: 'Row',
    isActive: false,
    metrics: [REPS],
  },
  { name: 'Front Lever Row', family: 'Row', isActive: false, metrics: [REPS] },

  // dip
  { name: 'Ring Dip', family: 'Dip', isActive: true, metrics: [REPS, LOAD] },
  { name: 'Dip', family: 'Dip', isActive: true, metrics: [REPS, LOAD] },
  {
    name: 'Ring Dip (Turned Out)',
    family: 'Dip',
    isActive: false,
    metrics: [REPS],
  },
  { name: 'Bulgarian Dip', family: 'Dip', isActive: false, metrics: [REPS] },

  // push_up
  { name: 'Push-Up', family: 'Push-up', isActive: true, metrics: [REPS] },
  { name: 'Ring Push-Up', family: 'Push-up', isActive: false, metrics: [REPS] },
  {
    name: 'Pseudo Planche Push-Up',
    family: 'Push-up',
    isActive: false,
    metrics: [REPS],
  },

  // support_hold
  {
    name: 'Ring Support Hold',
    family: 'Support hold',
    isActive: true,
    metrics: [HOLD],
  },
  {
    name: 'Ring Support Hold (Turned Out)',
    family: 'Support hold',
    isActive: false,
    metrics: [HOLD],
  },

  // l_sit
  { name: 'L-Sit', family: 'L-sit', isActive: true, metrics: [HOLD] },
  { name: 'L-Sit (Tuck)', family: 'L-sit', isActive: false, metrics: [HOLD] },
  { name: 'V-Sit', family: 'L-sit', isActive: false, metrics: [HOLD] },

  // front_lever — the progressions named in FEATURES.md §3.3
  {
    name: 'Front Lever (Tuck)',
    family: 'Front lever',
    isActive: true,
    metrics: [HOLD],
  },
  {
    name: 'Front Lever (Advanced Tuck)',
    family: 'Front lever',
    isActive: false,
    metrics: [HOLD],
  },
  {
    name: 'Front Lever (One Leg)',
    family: 'Front lever',
    isActive: false,
    metrics: [HOLD],
  },
  {
    name: 'Front Lever (Straddle)',
    family: 'Front lever',
    isActive: false,
    metrics: [HOLD],
  },
  {
    name: 'Front Lever (Full)',
    family: 'Front lever',
    isActive: false,
    metrics: [HOLD],
  },

  // back_lever
  {
    name: 'Back Lever (Tuck)',
    family: 'Back lever',
    isActive: true,
    metrics: [HOLD],
  },
  {
    name: 'Back Lever (Advanced Tuck)',
    family: 'Back lever',
    isActive: false,
    metrics: [HOLD],
  },
  {
    name: 'Back Lever (Straddle)',
    family: 'Back lever',
    isActive: false,
    metrics: [HOLD],
  },
  {
    name: 'Back Lever (Full)',
    family: 'Back lever',
    isActive: false,
    metrics: [HOLD],
  },

  // handstand
  { name: 'Handstand', family: 'Handstand', isActive: true, metrics: [HOLD] },
  {
    name: 'Handstand (Wall)',
    family: 'Handstand',
    isActive: false,
    metrics: [HOLD],
  },
  {
    name: 'Ring Handstand',
    family: 'Handstand',
    isActive: false,
    metrics: [HOLD],
  },

  // hspu
  { name: 'Handstand Push-Up', family: 'Handstand push-up', isActive: true, metrics: [REPS] },
  { name: 'Pike Push-Up', family: 'Handstand push-up', isActive: true, metrics: [REPS] },
  {
    name: 'Handstand Push-Up (Wall)',
    family: 'Handstand push-up',
    isActive: false,
    metrics: [REPS],
  },

  // squat
  {
    name: 'Pistol Squat',
    family: 'Squat',
    isActive: true,
    metrics: [REPS, LOAD],
  },
  {
    name: 'Pistol Squat (Assisted)',
    family: 'Squat',
    isActive: false,
    metrics: [REPS],
  },
  { name: 'Shrimp Squat', family: 'Squat', isActive: false, metrics: [REPS] },

  // core_hang
  {
    name: 'Hanging Leg Raise',
    family: 'Core hang',
    isActive: true,
    metrics: [REPS],
  },
  { name: 'Toes-to-Bar', family: 'Core hang', isActive: false, metrics: [REPS] },
  {
    name: 'Windshield Wiper',
    family: 'Core hang',
    isActive: false,
    metrics: [REPS],
  },
];

/**
 * Plants the catalogue if it has never been planted. Returns whether it ran.
 *
 * Idempotent by the flag, and a single transaction so a kill mid-seed leaves
 * the database untouched rather than half-populated.
 */
export async function seedIfNeeded(): Promise<boolean> {
  const flag = await db
    .select({ value: meta.value })
    .from(meta)
    .where(eq(meta.key, SEED_KEY))
    .limit(1);

  if (flag.length > 0) {
    return false;
  }

  await db.transaction(async (tx) => {
    for (const entry of CATALOGUE) {
      const [inserted] = await tx
        .insert(exercises)
        .values({
          name: entry.name,
          family: entry.family,
          isBuiltin: true,
          isActive: entry.isActive,
        })
        .returning({ id: exercises.id });

      if (!inserted) {
        throw new Error(`Failed to seed exercise: ${entry.name}`);
      }

      let displayOrder = 0;
      for (const metric of entry.metrics) {
        await tx.insert(exerciseMetrics).values({
          exerciseId: inserted.id,
          name: metric.name,
          type: metric.type,
          unit: metric.unit,
          displayOrder,
        });
        displayOrder += 1;
      }
    }

    await tx.insert(meta).values({ key: SEED_KEY, value: SEED_VERSION });
  });

  return true;
}
