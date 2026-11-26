// Which chapter of the sidebar is open. A chapter is a feature at the head of the book's tree; its entries are the
// features under it and its slides. One chapter is open at a time; which one is kept in a cookie per book, so the
// page is drawn open where it was left. Pure.

/** The cookie that keeps a book's open chapter: the chapter's id, or "" when every chapter is closed. */
export const chapterCookie = (book: string) => `galley_chapter_${book}`;

/** The open chapter: the one kept, if it is still a chapter; none if all were closed; otherwise the first. */
export function openChapter(chapters: string[], kept: string | undefined): string | null {
  if (kept === '') return null;
  if (kept && chapters.includes(kept)) return kept;
  return chapters[0] ?? null;
}
