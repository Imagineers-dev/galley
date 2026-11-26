// Signing in: only the editor answers papers and messages; reading needs no sign-in.
import { safeBack } from '../../lib/book/links';
import { enter } from '../actions';
import { Button } from '../ui/parts/button';
import { Field, Notice, Problem } from '../ui/parts/notice';

export default async function SignIn({ searchParams }: { searchParams: Promise<{ wrong?: string; resting?: string; back?: string }> }) {
  const { wrong, resting, back } = await searchParams;
  return (
    <Notice title="Sign in to answer" lede="Only the editor approves papers. Reading needs no sign-in.">
      <form action={enter}>
        <input type="hidden" name="back" value={safeBack(back)} />
        <Field type="password" name="passcode" placeholder="Passcode" autoFocus aria-label="Passcode" />
        <Button kind="main">Sign in</Button>
        {wrong && <Problem>That passcode is not right.</Problem>}
        {resting && <Problem>Too many wrong passcodes. Sign-in rests for fifteen minutes.</Problem>}
      </form>
    </Notice>
  );
}
