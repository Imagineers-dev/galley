// An icon an agent gave a feature, a section or a document (lib/book/icons.ts), drawn on the server from Phosphor in
// its weight and tone: small beside a sidebar entry (on the canvas), larger before a page's title.
import * as phosphor from '@phosphor-icons/react/ssr';
import type { ComponentType } from 'react';
import { type Icon, componentName } from '../../lib/book/icons';
import styles from './book-icon.module.css';

type Drawn = ComponentType<{ weight?: string; className?: string; 'aria-hidden'?: boolean }>;
const TONE = {
  ink: styles.ink, slate: styles.slate, orange: styles.orange, pink: styles.pink, purple: styles.purple, teal: styles.teal, brown: styles.brown,
} as const;

export function BookIcon({ icon, place }: { icon?: Icon; place: 'canvas' | 'page' }) {
  const Drawn = icon ? (phosphor as unknown as Record<string, Drawn>)[componentName(icon.name)] : undefined;
  if (!icon || !Drawn) return null;
  return <Drawn weight={icon.weight ?? 'regular'} aria-hidden className={`${styles.icon} ${place === 'canvas' ? styles.canvas : styles.page} ${TONE[icon.tone ?? 'ink']}`} />;
}
