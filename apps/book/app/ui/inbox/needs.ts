// What each need means as a state, in one place: a decision, an approval or a thing to try waits on the editor
// (cobalt); a note asks nothing (plain); what went wrong is red. The tag in the list and the dot in the rail use it.
import type { Needs } from '../../../lib/book/inbox-types';
import type { Status } from '../parts/status';

export const NEED_STATUS: Record<Needs, Status> = { decision: 'waiting', approval: 'waiting', try: 'waiting', fyi: 'plain', wrong: 'event' };
