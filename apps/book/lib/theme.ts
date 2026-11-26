// The reader's choice of Day or Night, kept in a cookie; without one the book follows the system.
export const THEME_COOKIE = 'book_theme';
export type Theme = 'light' | 'dark';
export const themeOf = (value: string | undefined): Theme | undefined => (value === 'light' || value === 'dark' ? value : undefined);
