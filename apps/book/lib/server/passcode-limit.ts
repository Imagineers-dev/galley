// Passcode attempts. After five wrong passcodes within fifteen minutes the sign-in rests for fifteen minutes.
// Kept in memory: the book runs as one process on this machine, and a restart clearing it is acceptable.
const WINDOW_MS = 15 * 60_000;
const MAX_WRONG = 5;

type Attempts = { wrong: number[] };
const state: Attempts = ((globalThis as { __bookPasscode?: Attempts }).__bookPasscode ??= { wrong: [] });

const recent = (now: number) => (state.wrong = state.wrong.filter((t) => now - t < WINDOW_MS));

/** Milliseconds until another attempt is allowed; 0 when one may be made now. */
export function restingFor(now = Date.now()): number {
  const wrong = recent(now);
  return wrong.length >= MAX_WRONG ? WINDOW_MS - (now - wrong[wrong.length - MAX_WRONG]) : 0;
}

export const noteWrong = (now = Date.now()) => void state.wrong.push(now);
export const clearAttempts = () => void (state.wrong = []);
