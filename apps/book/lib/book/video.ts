// Which links are YouTube videos, where each starts, and where its picture and player live. Pure.
const ID = /^[\w-]{11}$/;
const WATCH_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const TIME = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/;
/** No video starts more than a day in: anything later is a mistake in the link. */
const MAX_START = 86_400;

export type YoutubeVideo = { id: string; start: number | null };

/** Seconds from a link's start time: 467, 467s or 7m47s. Null when it has none, it is zero, or it cannot be read. */
function startOf(value: string | null): number | null {
  const parts = value ? TIME.exec(value) : null;
  if (!parts) return null;
  const seconds = Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0);
  return seconds > 0 && seconds <= MAX_START ? seconds : null;
}

/** The video and its start when the link is a YouTube video (youtube.com/watch?v=… or youtu.be/…); otherwise null. */
export function youtubeVideo(link: string | undefined): YoutubeVideo | null {
  let url: URL;
  try {
    url = new URL(link ?? '');
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : WATCH_HOSTS.has(url.hostname) && url.pathname === '/watch' ? url.searchParams.get('v') : null;
  return id && ID.test(id) ? { id, start: startOf(url.searchParams.get('t') ?? url.searchParams.get('start') ?? new URLSearchParams(url.hash.slice(1)).get('t')) } : null;
}

/** A place in a video as a clock: 7:47, or 1:02:03 past the hour. */
export function clockWords(seconds: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds % 60)}` : `${minutes}:${pad(seconds % 60)}`;
}

export const videoPicture = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const videoPlayer = (id: string, start: number | null = null) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${start ? `&start=${start}` : ''}`;
