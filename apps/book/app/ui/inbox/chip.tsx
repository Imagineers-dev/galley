// A message's tag: what it needs from you, in the colour of its state (needs.ts), or a plain fact such as when it
// comes back. Both are the shared status pill at its small size.
import type { ReactNode } from 'react';
import { NEEDS_WORDS } from '../../../lib/book/inbox';
import type { Needs } from '../../../lib/book/inbox-types';
import { StatusPill } from '../parts/status';
import { NEED_STATUS } from './needs';

export const Chip = ({ children }: { children: ReactNode }) => <StatusPill status="plain" small>{children}</StatusPill>;

export const NeedChip = ({ needs, label }: { needs: Needs; label?: string }) => (
  <StatusPill status={NEED_STATUS[needs]} small>{label ?? NEEDS_WORDS[needs].tag}</StatusPill>
);
