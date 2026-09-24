import * as migration_20260924_152623_c1_users_people from './20260924_152623_c1_users_people';
import * as migration_20260924_160638_c2_events_guestlist from './20260924_160638_c2_events_guestlist';
import * as migration_20260924_174748_e1_delivery_dedupe from './20260924_174748_e1_delivery_dedupe';

export const migrations = [
  {
    up: migration_20260924_152623_c1_users_people.up,
    down: migration_20260924_152623_c1_users_people.down,
    name: '20260924_152623_c1_users_people',
  },
  {
    up: migration_20260924_160638_c2_events_guestlist.up,
    down: migration_20260924_160638_c2_events_guestlist.down,
    name: '20260924_160638_c2_events_guestlist',
  },
  {
    up: migration_20260924_174748_e1_delivery_dedupe.up,
    down: migration_20260924_174748_e1_delivery_dedupe.down,
    name: '20260924_174748_e1_delivery_dedupe'
  },
];
