// The tests read fixed settings, not this machine's: a time zone with a half-hour offset, so day sums are tested
// where they break, and two example repositories. GALLEY_LIVE turns on the checks against a running Galley, which
// read your own settings and keys instead.
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

const live = Boolean(process.env.GALLEY_LIVE);

export default defineConfig({
  test: {
    env: live ? {} : { GALLEY_CONFIG: join(import.meta.dirname, 'tests', 'fixtures', 'settings.json') },
  },
});
