// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_productive_spiral.sql';
import m0001 from './0001_readable_families.sql';
import m0002 from './0002_canonical_units.sql';
import m0003 from './0003_drop_rest_seconds.sql';
import m0004 from './0004_remove_added_load.sql';
import m0005 from './0005_entry_slot_link.sql';
import m0006 from './0006_performed_at_index.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005,
m0006
    }
  }
  