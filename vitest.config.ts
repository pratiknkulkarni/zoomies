import { defineConfig } from 'vitest/config';

/**
 * Unit tests only, and only over logic that can silently corrupt training
 * history: lib/timers.ts, the aggregation and personal-record queries, and
 * export serialisation (TECH_STACK.md §8).
 *
 * No component, navigation, snapshot or E2E tests. Nothing here touches React
 * Native, so the default node environment is enough and no RN preset is needed.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'db/**/*.test.ts'],
  },
});
