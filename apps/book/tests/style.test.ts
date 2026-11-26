// The architecture of the book's styles and components (STYLE_GUIDE.md, CLAUDE.md "How we work"): small files, every
// colour and size from the tokens, each selector defined once, inline styles only for custom properties, every
// module class used, and client components only where they must be. Every file meets every rule: there is no list of
// exceptions.
import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { filesUnder, read, stylesheets, withoutComments } from './helpers/source';

const CLIENT = [
  'app/error.tsx', 'app/ui/asset/slide-frame.tsx', 'app/ui/inbox-keys.tsx', 'app/ui/lesson/video.tsx', 'app/ui/shell/book-switcher.tsx',
  'app/ui/shell/live-refresh.tsx', 'app/ui/shell/nav-item.tsx', 'app/ui/shell/nav-sync.tsx',
];

const code = () => filesUnder('app', (p) => /\.tsx?$/.test(p)).concat(filesUnder('lib', (p) => p.endsWith('.ts')));
const everyFile = () => [...code(), ...stylesheets(), ...filesUnder('tests', (p) => p.endsWith('.ts')), ...filesUnder('scripts', () => true), ...filesUnder('bin', () => true)];

const SHORTHANDS = ['margin', 'padding', 'border', 'font', 'background', 'inset', 'grid', 'outline', 'text-decoration', 'overflow', 'gap'];
const shorthandOf = (p: string) => (p === 'border-radius' ? p : SHORTHANDS.find((s) => p === s || p.startsWith(`${s}-`)) ?? p);

/** Each rule in a stylesheet: the at-rule it sits in ("" at the top), its selectors, and the properties it sets. */
function rules(css: string): { context: string; selectors: string[]; properties: string[] }[] {
  const out: { context: string; selectors: string[]; properties: string[] }[] = [];
  const walk = (text: string, context: string) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf('{', i);
      if (open < 0) break;
      const head = text.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      for (; j < text.length && depth; j++) depth += text[j] === '{' ? 1 : text[j] === '}' ? -1 : 0;
      const body = text.slice(open + 1, j - 1);
      if (head.startsWith('@')) walk(body, `${context}${head} `);
      else {
        const selectors = head.split(',').map((s) => s.trim().replace(/\s+/g, ' '));
        // A longhand counts as its shorthand (margin-top is margin), so a shorthand overridden by a longhand is caught.
        const properties = body.split(';').map((d) => d.split(':')[0].trim()).filter(Boolean).map(shorthandOf);
        out.push({ context, selectors, properties });
      }
      i = j;
    }
  };
  walk(withoutComments(css), '');
  return out;
}

/**
 * Override stacks: a selector given its own rule twice, or one property set twice for the same selector (a later
 * rule quietly winning over an earlier one). A shared rule plus a rule of its own, on other properties, is fine.
 */
function overrides(file: string): string[] {
  const out: string[] = [];
  const alone = new Map<string, number>();
  const set = new Map<string, number>();
  for (const rule of rules(read(file))) {
    if (rule.selectors.length === 1) {
      const key = `${rule.context}${rule.selectors[0]}`;
      alone.set(key, (alone.get(key) ?? 0) + 1);
    }
    for (const selector of rule.selectors) {
      for (const property of new Set(rule.properties)) {
        const key = `${rule.context}${selector} { ${property} }`;
        set.set(key, (set.get(key) ?? 0) + 1);
      }
    }
  }
  for (const [key, n] of alone) if (n > 1) out.push(`${file}: ${key} has two rules of its own`);
  for (const [key, n] of set) if (n > 1) out.push(`${file}: ${key} is set twice`);
  return out;
}

const breaks = (files: string[], test: (file: string) => boolean) => files.filter(test);

describe('the style architecture', () => {
  it('no file is over 200 lines', () => {
    const long = breaks(everyFile(), (f) => read(f).split('\n').length > 201);
    expect(long).toEqual([]);
  });

  it('colours come only from the tokens', () => {
    const colour = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(|:\s*[^;{}]*\b(?:white|black|red|green|blue|yellow|orange|purple|gray|grey|navy|silver)\b/i;
    const raw = breaks(stylesheets().filter((f) => f !== 'app/styles/tokens.css'), (f) => colour.test(withoutComments(read(f)).replace(/var\(--[\w-]+\)/g, '')));
    expect(raw).toEqual([]);
  });

  it('font sizes come only from the tokens', () => {
    // A raw size is a number with a unit for font-size, or in the font shorthand any number with a unit that is not
    // the line height (after "/").
    const rawSize = (css: string) => /font-size:\s*[\d.]+[a-z%]/.test(css) || [...css.matchAll(/font:([^;}]*)/g)].some(([, v]) => /(^|[\s(])[\d.]+(px|rem|em|pt)\b/.test(v.replace(/\/\s*[\d.]+[a-z%]*/g, '')));
    const raw = breaks(stylesheets().filter((f) => f !== 'app/styles/tokens.css'), (f) => rawSize(withoutComments(read(f))));
    expect(raw).toEqual([]);
  });

  it('no override stacks: a selector has one rule of its own, and each property is set once for it', () => {
    const stacked = stylesheets().flatMap(overrides);
    const global = stylesheets().filter((f) => !f.endsWith('.module.css'));
    const owner = new Map<string, string>();
    for (const file of global) {
      for (const rule of rules(read(file)).filter((r) => r.selectors.length === 1)) {
        const key = `${rule.context}${rule.selectors[0]}`;
        if (owner.has(key) && owner.get(key) !== file) stacked.push(`${key} has rules in ${owner.get(key)} and ${file}`);
        owner.set(key, file);
      }
    }
    expect(stacked).toEqual([]);
  });

  it('inline styles set only custom properties', () => {
    // Every style= must be an object literal of custom properties only; any other value (a variable, a condition) breaks it.
    const allowed = (tail: string) => {
      const literal = /^\{\{([^}]*)\}(?:\s+as\s+[\w.]+)?\}/.exec(tail);
      return !!literal && literal[1].split(',').every((p) => !p.trim() || /^['"]--/.test(p.trim()));
    };
    const inline = breaks(code().filter((f) => f.endsWith('.tsx')), (f) => read(f).split('style=').slice(1).some((tail) => !allowed(tail)));
    expect(inline).toEqual([]);
  });

  it('corners come only from the radius tokens (or a circle)', () => {
    const raw = stylesheets().filter((f) => f !== 'app/styles/tokens.css').flatMap((f) =>
      [...withoutComments(read(f)).matchAll(/border-radius:\s*([^;}]+)/g)]
        .filter(([, v]) => !v.trim().split(/\s+/).every((p) => /^var\(--radius-[\w-]+\)$/.test(p) || p === '50%' || p === '0'))
        .map(([, v]) => `${f}: ${v.trim()}`));
    expect(raw).toEqual([]);
  });

  it('a class composed from another file is used directly, not passed on through a second class (the bundler drops it)', () => {
    const chained: string[] = [];
    for (const module of stylesheets().filter((f) => f.endsWith('.module.css'))) {
      const rulesOf = [...withoutComments(read(module)).matchAll(/\.([a-zA-Z]\w*)\s*\{([^}]*)\}/g)];
      const external = new Set(rulesOf.filter(([, , body]) => /composes:[^;]*from\s/.test(body)).map(([, cls]) => cls));
      for (const [, cls, body] of rulesOf) {
        for (const [, list] of body.matchAll(/composes:\s*([\w\s]+?)\s*;/g)) {
          for (const c of list.split(/\s+/)) if (external.has(c)) chained.push(`${module}: .${cls} composes .${c}, which composes from another file`);
        }
      }
    }
    expect(chained).toEqual([]);
  });

  it('a title that composes the title face never uses the font shorthand (it would reset the soft axis and the weight)', () => {
    const reset = stylesheets().filter((f) => f.endsWith('.module.css')).flatMap((module) =>
      [...withoutComments(read(module)).matchAll(/\.([a-zA-Z]\w*)\s*\{([^}]*)\}/g)]
        .filter(([, , body]) => /composes:[^;]*titleFace/.test(body) && /(^|[;{\s])font\s*:/.test(body))
        .map(([, cls]) => `${module}: .${cls}`));
    expect(reset).toEqual([]);
  });

  it('every class a module defines is used by a component that imports it, or composed by another class', () => {
    const modules = stylesheets().filter((f) => f.endsWith('.module.css'));
    // composes: a b;  composes: a from './x.module.css';  — each composed class counts as used, in its own module.
    const composed = new Map<string, Set<string>>(modules.map((m) => [m, new Set<string>()]));
    for (const module of modules) {
      for (const [, list, from] of withoutComments(read(module)).matchAll(/composes:\s*([\w\s]+?)(?:\s+from\s+'([^']+)')?\s*;/g)) {
        const target = from ? join(dirname(module), from) : module;
        for (const c of list.split(/\s+/).filter(Boolean)) composed.get(target)?.add(c);
      }
    }
    const unused: string[] = [];
    for (const module of modules) {
      const name = module.split('/').pop() as string;
      // Each component that imports the module, and the name it imports it under (styles, watch, …).
      const users = code().flatMap((f) => {
        if (f.split('/').slice(0, -1).join('/') !== module.split('/').slice(0, -1).join('/')) return [];
        const as = new RegExp(`import (\\w+) from '\\./${name.replace(/\./g, '\\.')}'`).exec(read(f))?.[1];
        return as ? [{ f, as }] : [];
      });
      const used = new Set(users.flatMap(({ f, as }) => [...read(f).matchAll(new RegExp(`\\b${as}(?:\\.(\\w+)|\\[['"](\\w+)['"]\\])`, 'g'))].map((m) => m[1] ?? m[2])));
      for (const c of composed.get(module) ?? []) used.add(c);
      const defined = new Set([...withoutComments(read(module)).replace(/:global\([^)]*\)/g, '').replace(/from\s+'[^']+'/g, '').matchAll(/\.([a-zA-Z]\w*)/g)].map((m) => m[1]));
      unused.push(...[...defined].filter((c) => !used.has(c)).map((c) => `${module}: .${c}`));
      if (!users.length && !(composed.get(module)?.size)) unused.push(`${module}: nothing imports or composes it`);
    }
    expect(unused).toEqual([]);
  });

  it('client components only where they must be', () => {
    expect(code().filter((f) => /^['"]use client['"]/m.test(read(f)))).toEqual([...CLIENT].sort());
  });
});
