// The editor's sign-in on this machine. A passcode gives a random session token in a cookie; the book keeps only its
// hash and expiry, so a sign-in can be revoked and a stolen database holds no live cookie. Approvals check this,
// never a request field.
import { cookies } from 'next/headers';
import { appendSession, sessionOf } from '../store/sessions';
import { clearAttempts, noteWrong, restingFor } from './passcode-limit';
import { hashOf, newToken, sameSecret } from './secrets';

const COOKIE = 'book_editor';
const DAYS = 30;

export async function isEditor(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  const session = await sessionOf(hashOf(token));
  return !!session && !session.revoked && Date.parse(session.expires) > Date.now();
}

export type SignIn = 'in' | 'wrong' | 'resting';

export async function signIn(passcode: string): Promise<SignIn> {
  if (restingFor() > 0) return 'resting';
  const expected = process.env.BOOK_EDITOR_PASSCODE;
  if (!expected || !sameSecret(passcode, expected)) {
    noteWrong();
    return restingFor() > 0 ? 'resting' : 'wrong';
  }
  clearAttempts();
  const token = newToken();
  const expires = new Date(Date.now() + DAYS * 86_400_000).toISOString();
  await appendSession({ hash: hashOf(token), expires, revoked: false });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'strict', path: '/', maxAge: DAYS * 86_400 });
  return 'in';
}

/** Signs this browser out and ends its session in the book. */
export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const session = await sessionOf(hashOf(token));
    if (session && !session.revoked) await appendSession({ ...session, revoked: true });
  }
  jar.delete(COOKIE);
}
