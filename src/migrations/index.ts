import * as migration_20260924_152623_c1_users_people from './20260924_152623_c1_users_people';

export const migrations = [
  {
    up: migration_20260924_152623_c1_users_people.up,
    down: migration_20260924_152623_c1_users_people.down,
    name: '20260924_152623_c1_users_people'
  },
];
