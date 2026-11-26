// The runner, against a throwaway git repository and a throwaway book that only listens.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { childEnv, postRun, prove, refusedCommand } from '../bin/prove.mjs';

// These tests run real git and pnpm, which take far longer on a busy machine.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 60_000 });

type Listed = { id: string; at?: string; title: string; command: unknown };
let tests: Listed[] = [];
let posted: Record<string, unknown>[] = [];
let refuseWrites = false;
const server = createServer((req, res) => {
  const send = (status: number, body: unknown) => res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
  if (req.method === 'GET') return send(200, { tests });
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    if (refuseWrites) return send(422, { refused: ['no'] });
    posted.push(JSON.parse(raw));
    send(200, { recorded: `run:${posted.length}` });
  });
});

let url = '';
let repo = '';
const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
const command = (...argv: string[]) => ({ repo: 'example-tools', argv, surface: 'app', subject: 'synthetic' });
const go = () => prove({ work: 'work:a/b', book: 'throwaway', repo: 'example-tools', url, cwd: repo });
const worktrees = () => git('worktree', 'list').split('\n').length;

beforeAll(async () => {
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.BOOK_KEY = 'secret-key';
  repo = realpathSync(mkdtempSync(join(tmpdir(), 'prove-repo-')));
  git('init', '-q');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 'T');
  writeFileSync(join(repo, 'package.json'), '{"name":"example-tools","private":true,"version":"1.0.0","scripts":{"check":"node ok.mjs","loud":"node loud.mjs"}}');
  writeFileSync(join(repo, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n\nimporters:\n\n  .: {}\n");
  writeFileSync(join(repo, 'ok.mjs'), 'process.exit(0)');
  writeFileSync(join(repo, 'no.mjs'), 'process.exit(3)');
  writeFileSync(join(repo, 'loud.mjs'), "console.error('Missing script: this is the test talking'); process.exit(2);");
  writeFileSync(join(repo, 'env.mjs'), "import { writeFileSync } from 'node:fs'; import { homedir } from 'node:os'; writeFileSync(process.argv[2], JSON.stringify({ key: process.env.BOOK_KEY ?? null, home: homedir() }));");
  git('add', '.');
  git('commit', '-qm', 'one');
});
afterEach(() => { tests = []; posted = []; refuseWrites = false; });
afterAll(() => {
  delete process.env.BOOK_KEY;
  server.close();
  rmSync(repo, { recursive: true, force: true });
});

describe('the runner', () => {
  it('records a pass with the commit and date from git', async () => {
    tests = [{ id: 'test:ok', title: 'ok', command: command('node', 'ok.mjs') }];
    const out = await go();
    expect(out.couldNotRun).toEqual([]);
    expect(posted[0]).toMatchObject({ book: 'throwaway', test: 'test:ok', result: 'pass', sha: git('rev-parse', 'HEAD'), committedAt: git('show', '-s', '--format=%cI', 'HEAD') });
  });
  it('records a failure from the exit code', async () => {
    tests = [{ id: 'test:no', title: 'no', command: command('node', 'no.mjs') }];
    await go();
    expect(posted[0]).toMatchObject({ result: 'fail' });
  });
  it('runs the last commit, not the working files', async () => {
    writeFileSync(join(repo, 'ok.mjs'), 'process.exit(9)');
    tests = [{ id: 'test:ok', title: 'ok', command: command('node', 'ok.mjs') }];
    await go();
    git('checkout', '--', 'ok.mjs');
    expect(posted[0]).toMatchObject({ result: 'pass' });
  });
  it('keeps the book key from the test, by name and through its home', async () => {
    const seen = join(repo, '..', `seen-${process.pid}`);
    tests = [{ id: 'test:env', title: 'env', command: command('node', 'env.mjs', seen) }];
    await go();
    const { key, home } = JSON.parse(readFileSync(seen, 'utf8'));
    rmSync(seen);
    expect(key).toBeNull();
    expect(home).not.toBe(homedir());
    expect(existsSync(home)).toBe(false); // the temporary home went with the copy
  });
  it('posts nothing when a test cannot run, and says so', async () => {
    tests = [{ id: 'test:gone', title: 'gone', command: command('pnpm', 'run', 'definitely-not-a-script-xyz') }, { id: 'test:sh', title: 'sh', command: command('sh', '-c', 'exit 0') }];
    const out = await go();
    expect(out.couldNotRun.map((c: { test: string }) => c.test).sort()).toEqual(['test:gone', 'test:sh']);
    expect(posted).toEqual([]);
  });
  it('posts nothing for a script that is not in the commit, or a package that matches nothing', async () => {
    tests = [{ id: 'test:file', title: 'f', command: command('node', 'gone.mjs') }, { id: 'test:filter', title: 'p', command: command('pnpm', '--filter', 'no-such-package', 'test') }];
    const out = await go();
    expect(out.couldNotRun.map((c: { test: string }) => c.test).sort()).toEqual(['test:file', 'test:filter']);
    expect(posted).toEqual([]);
  });
  it('records a real failure even when its output says "Missing script"', async () => {
    tests = [{ id: 'test:loud', title: 'l', command: command('pnpm', 'run', 'loud') }];
    expect((await go()).couldNotRun).toEqual([]);
    expect(posted[0]).toMatchObject({ test: 'test:loud', result: 'fail' });
  });
  it('posts nothing when the package has no such script, with or without a filter', async () => {
    tests = [{ id: 'test:none', title: 'n', command: command('pnpm', 'test') }, { id: 'test:filtered', title: 'f', command: command('pnpm', '--filter', 'example-tools', 'run', 'nope') }];
    const out = await go();
    expect(out.couldNotRun.map((c: { test: string }) => c.test).sort()).toEqual(['test:filtered', 'test:none']);
    expect(posted).toEqual([]);
  });
  it('runs a script through a filter that matches its package', async () => {
    tests = [{ id: 'test:filter-ok', title: 'f', command: command('pnpm', '--filter', 'example-tools', 'run', 'check') }];
    expect((await go()).couldNotRun).toEqual([]);
    expect(posted[0]).toMatchObject({ result: 'pass' });
  });
  it('runs a pnpm script with its temporary home', async () => {
    tests = [{ id: 'test:script', title: 's', command: command('pnpm', 'run', 'check') }];
    expect((await go()).couldNotRun).toEqual([]);
    expect(posted[0]).toMatchObject({ result: 'pass' });
  });
  it('sends the test version and the command it ran', async () => {
    tests = [{ id: 'test:ok', at: '2026-11-23T10:00:00.000Z', title: 'ok', command: command('node', 'ok.mjs') }];
    await go();
    expect(posted[0]).toMatchObject({ testAt: '2026-11-23T10:00:00.000Z', argv: ['node', 'ok.mjs'] });
  });
  it('runs nothing in a checkout that is not the repository it names', async () => {
    tests = [{ id: 'test:ok', title: 'ok', command: { ...command('node', 'ok.mjs'), repo: 'example-app' } }];
    const out = await prove({ work: 'work:a/b', book: 'throwaway', repo: 'example-app', url, cwd: repo });
    expect(out.couldNotRun[0].why).toContain('not example-app');
    expect(posted).toEqual([]);
  });
  it('removes its worktree every time', async () => {
    const before = worktrees();
    tests = [{ id: 'test:ok', title: 'ok', command: command('node', 'ok.mjs') }, { id: 'test:no', title: 'no', command: command('node', 'no.mjs') }];
    await go();
    expect(worktrees()).toBe(before);
    expect(existsSync(join(repo, '.git', 'worktrees'))).toBe(false);
  });
  it('reports a result the book would not take', async () => {
    refuseWrites = true;
    tests = [{ id: 'test:ok', title: 'ok', command: command('node', 'ok.mjs') }];
    const out = await go();
    expect(out.recorded).toEqual([]);
    expect(out.couldNotRun).toHaveLength(1);
  });
  it('runs only for its two repositories', async () => {
    const out = await prove({ work: 'w', book: 'b', repo: 'elsewhere', url, cwd: repo });
    expect(out.recorded).toEqual([]);
    expect(posted).toEqual([]);
  });
});

describe('what the runner refuses', () => {
  it.each([[['sh', '-c', 'x']], [['bash', 'x']], [['/usr/bin/node', 'x']], [['npx', 'x']], [[]]])('will not run %j', (argv) => {
    expect(refusedCommand({ repo: 'example-tools', argv }, 'example-tools')).toMatch(/pnpm or node/);
  });
  it('will not run another repository\'s test', () => expect(refusedCommand({ repo: 'example-app', argv: ['pnpm', 'test'] }, 'example-tools')).toMatch(/runs in/));
  it('takes pnpm and node', () => {
    expect(refusedCommand({ repo: 'example-tools', argv: ['pnpm', 'test'] }, 'example-tools')).toBeNull();
    expect(refusedCommand({ repo: 'example-tools', argv: ['node', 'x'] }, 'example-tools')).toBeNull();
  });
  it('strips the key from the environment', () => {
    expect(childEnv({ BOOK_KEY: 'k', PATH: '/bin' } as unknown as NodeJS.ProcessEnv)).toEqual({ PATH: '/bin' });
    expect(childEnv({ BOOK_KEY: 'k', HOME: '/real', XDG_CONFIG_HOME: '/real/c' } as unknown as NodeJS.ProcessEnv, '/tmp/h')).toEqual({ HOME: '/tmp/h', USERPROFILE: '/tmp/h' });
  });
});

describe('posting a result', () => {
  const body = { test: 't' };
  it('asks a book that did not answer again, and stops at the first answer', async () => {
    const answers = [{ ok: false, unreachable: true }, { ok: true, data: { recorded: 'run:1' } }];
    const call = vi.fn(async () => answers.shift()!);
    expect(await postRun('u', 'example-tools', body, { waitMs: 0, call: call as never })).toEqual({ ok: true, data: { recorded: 'run:1' } });
    expect(call).toHaveBeenCalledTimes(2);
  });
  it('never asks again after a refusal, and gives up after three tries', async () => {
    const refused = vi.fn(async () => ({ ok: false, status: 422, refused: ['no'] }));
    expect(await postRun('u', 'example-tools', body, { waitMs: 0, call: refused as never })).toMatchObject({ refused: ['no'] });
    expect(refused).toHaveBeenCalledTimes(1);
    const down = vi.fn(async () => ({ ok: false, unreachable: true }));
    expect(await postRun('u', 'example-tools', body, { waitMs: 0, call: down as never })).toMatchObject({ unreachable: true });
    expect(down).toHaveBeenCalledTimes(3);
  });
});
