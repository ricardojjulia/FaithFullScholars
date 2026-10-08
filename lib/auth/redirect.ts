export const DEFAULT_NEXT = '/dashboard';

const PROBE_ORIGIN = 'http://same-origin.invalid';

/**
 * Only same-origin relative paths may be used as the post-login destination.
 *
 * Rejects:
 * - absolute URLs (`https://evil.com`);
 * - protocol-relative URLs (`//evil.com`, `/\evil.com`);
 * - any backslash, which browsers treat as `/`;
 * - any ASCII control character. The WHATWG URL parser strips tab/CR/LF, so
 *   `/\t/evil.com` would become `//evil.com`.
 * As a final check it resolves the path against a probe origin and requires the
 * origin to be unchanged. Callers may pass the result to `redirect()` or to
 * `new URL(next, origin)`.
 */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return DEFAULT_NEXT;
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return DEFAULT_NEXT;
  try {
    if (new URL(next, PROBE_ORIGIN).origin !== PROBE_ORIGIN) return DEFAULT_NEXT;
  } catch {
    return DEFAULT_NEXT;
  }
  return next;
}
