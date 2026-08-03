import type { Config } from 'drizzle-kit';

/**
 * Migrations are generated here and bundled with the app, then applied on
 * launch. Forward-only: a migration that could lose training history is not
 * shipped (TECH_STACK.md §4.4).
 */
export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
