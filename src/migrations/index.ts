import * as migration_20260924_152623_c1_users_people from './20260924_152623_c1_users_people';
import * as migration_20260924_160638_c2_events_guestlist from './20260924_160638_c2_events_guestlist';
import * as migration_20260924_174748_e1_delivery_dedupe from './20260924_174748_e1_delivery_dedupe';
import * as migration_20261012_103211_photo_consent from './20261012_103211_photo_consent';
import * as migration_20261012_133736_rsvp_form_options from './20261012_133736_rsvp_form_options';
import * as migration_20261012_151822_default_rsvp_template from './20261012_151822_default_rsvp_template';

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
    name: '20260924_174748_e1_delivery_dedupe',
  },
  {
    up: migration_20261012_103211_photo_consent.up,
    down: migration_20261012_103211_photo_consent.down,
    name: '20261012_103211_photo_consent',
  },
  {
    up: migration_20261012_133736_rsvp_form_options.up,
    down: migration_20261012_133736_rsvp_form_options.down,
    name: '20261012_133736_rsvp_form_options',
  },
  {
    up: migration_20261012_151822_default_rsvp_template.up,
    down: migration_20261012_151822_default_rsvp_template.down,
    name: '20261012_151822_default_rsvp_template'
  },
];
