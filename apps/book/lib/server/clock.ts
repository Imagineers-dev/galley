// The day it is now in the book's time zone (YYYY-MM-DD), for snoozes and "what waits today".
import { dayOf } from '../book/days';

export const today = () => dayOf(Date.now());
