// This install's settings, in one file the editor writes by hand: ~/.config/galley/config.json (GALLEY_HOME moves the
// folder, GALLEY_CONFIG names another file). It is never a record, so no agent can change it through the book.
//
//   {
//     "timeZone": "Europe/London",
//     "repositories": {
//       "my-app": { "package": "my-app", "installedApp": { "part": "Desktop app", "where": "plist:/Applications/My App.app" } }
//     }
//   }
//
// timeZone is the editor's: "today", the diary's days and snoozes turn over at its midnight. Left out, it is this
// machine's. repositories are the ones the runner may run tests in: each names the "name" in its package.json, so the
// runner knows it is in the tree it says it is, and, if it has one, the installed app whose build a try counts for.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const galleyHome = () => process.env.GALLEY_HOME ?? join(homedir(), '.config', 'galley');
export const configPath = () => process.env.GALLEY_CONFIG ?? join(galleyHome(), 'config.json');

function read() {
  try {
    return JSON.parse(readFileSync(configPath(), 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return {};
    throw new Error(`Galley cannot read its settings in ${configPath()}: ${error.message}`);
  }
}

/** @param {string | undefined} value @returns {string} */
function zoneOf(value) {
  const zone = value ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
  } catch {
    throw new Error(`Galley's settings name a time zone that does not exist: ${zone} (in ${configPath()}).`);
  }
  return zone;
}

const NAME = /^[a-z0-9][a-z0-9._-]*$/;

/**
 * `plistPrefix` names the keys the app's Info.plist says its build in: <prefix>Commit and <prefix>UncommittedFiles
 * (Galley when left out).
 * @typedef {{ package: string, installedApp?: { part: string, where: string, plistPrefix?: string } }} Repository
 */

/** @param {Record<string, Repository>} [value] @returns {Readonly<Record<string, Repository>>} */
function repositoriesOf(value = {}) {
  for (const [name, repo] of Object.entries(value)) {
    if (!NAME.test(name)) throw new Error(`Galley's settings name a repository it cannot use: "${name}" (lower case, digits, . _ -).`);
    if (typeof repo?.package !== 'string' || !repo.package) throw new Error(`Repository "${name}" in Galley's settings needs its package.json "name" as "package".`);
    const app = repo.installedApp;
    if (app !== undefined && (typeof app?.part !== 'string' || typeof app?.where !== 'string' || !app.where.startsWith('plist:')))
      throw new Error(`Repository "${name}" in Galley's settings: "installedApp" needs a "part" and a "where" of the form plist:/Applications/<App>.app.`);
    if (app?.plistPrefix !== undefined && !/^[A-Za-z][A-Za-z0-9]*$/.test(app.plistPrefix))
      throw new Error(`Repository "${name}" in Galley's settings: "plistPrefix" is letters and digits, e.g. "MyApp" for MyAppCommit.`);
  }
  return Object.freeze({ ...value });
}

const settings = read();

/** The editor's time zone: every day in the book is a date in it. */
export const TIME_ZONE = zoneOf(settings.timeZone);

/** The repositories the runner may run tests in, by name. */
export const REPOSITORIES = repositoriesOf(settings.repositories);
