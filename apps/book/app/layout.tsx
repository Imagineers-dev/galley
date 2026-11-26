import type { Metadata } from 'next';
import { Fraunces, Inter, Literata } from 'next/font/google';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { THEME_COOKIE, themeOf } from '../lib/theme';
import './styles/tokens.css';
import './styles/base.css';

// The faces: Literata to read, Fraunces (soft) for titles, Inter for the interface.
const literata = Literata({ subsets: ['latin'], style: ['normal', 'italic'], axes: ['opsz'], variable: '--font-literata', display: 'swap' });
const fraunces = Fraunces({ subsets: ['latin'], axes: ['SOFT', 'opsz'], variable: '--font-fraunces', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = { title: 'Galley', description: "Your agents' work, read as a book, feature by feature." };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = themeOf((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="en" data-theme={theme} className={`${literata.variable} ${fraunces.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
