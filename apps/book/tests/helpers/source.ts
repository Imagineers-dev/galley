// The book's source files, for the tests that hold its architecture: every stylesheet, component and module.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const ROOT = join(import.meta.dirname, '..', '..');

export function filesUnder(dir: string, test: (path: string) => boolean): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      const path = join(d, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (test(path)) out.push(relative(ROOT, path));
    }
  };
  walk(join(ROOT, dir));
  return out.sort();
}

export const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');
export const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
export const stylesheets = () => filesUnder('app', (p) => p.endsWith('.css'));
