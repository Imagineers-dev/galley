// Which app on this machine is each repository's installed build, from this install's settings (bin/galley-config.mjs):
// reviewed by the editor and not a record, so no agent can change it. A repository with no installed app here has
// no installed build, and an editor's try on it reads Claimed.
import { REPOSITORIES } from '../../bin/galley-config.mjs';

export type InstalledApp = { part: string; where: string };

export const INSTALLED_APPS: Readonly<Record<string, InstalledApp>> = Object.freeze(
  Object.fromEntries(Object.entries(REPOSITORIES).flatMap(([repo, r]) => (r.installedApp ? [[repo, r.installedApp]] : []))),
);
