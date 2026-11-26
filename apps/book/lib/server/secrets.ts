// Random tokens and their hashes. A token is shown once (to a file or a cookie); the book keeps only the hash.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const newToken = () => randomBytes(32).toString('base64url');
export const hashOf = (token: string) => createHash('sha256').update(token).digest('hex');

/** Compares two secrets in constant time, whatever their lengths. */
export const sameSecret = (a: string, b: string) => timingSafeEqual(Buffer.from(hashOf(a), 'hex'), Buffer.from(hashOf(b), 'hex'));
