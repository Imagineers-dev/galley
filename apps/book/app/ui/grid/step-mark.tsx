// The mark that shows a step's state, shared by the chapter's grid, its key and a story's list of steps.
import type { WorkState } from '../../../lib/book/types';
import { type Status, statusOf } from '../parts/status';
import styles from './step-mark.module.css';

/** A step's look follows the book's one mapping of states (statusOf); only its shape is the mark's own. */
const SHAPE: Partial<Record<Status, string>> = { done: styles.done, underway: styles.underway, next: styles.next };

/** The classes for a mark: null is a step not planned yet; `small` is the size beside words. */
export const markOf = (state: WorkState | null, small = false) =>
  `${styles.mark} ${small ? styles.small : ''} ${state ? SHAPE[statusOf(state)] ?? styles.next : styles.none}`;

export const StepMark = ({ state, small = false }: { state: WorkState | null; small?: boolean }) => <span className={markOf(state, small)} aria-hidden />;
