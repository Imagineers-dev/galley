// Reading the book as it stood on an earlier day: the banner says so, and goes back to today on the same page
// (the action returns to the page it was sent from).
import { readAsOf } from '../actions';
import styles from './as-of.module.css';
import { Button } from './parts/button';

const label = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function AsOfBanner({ asOf }: { asOf: string }) {
  return (
    <form action={readAsOf} className={styles.banner}>
      <input type="hidden" name="day" value="" />
      <span>You are reading the book as it stood at the end of <b>{label(asOf)}</b>. Later changes are hidden.</span>
      <Button>Back to today</Button>
    </form>
  );
}
