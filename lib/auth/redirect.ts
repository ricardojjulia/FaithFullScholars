export const DEFAULT_NEXT = '/dashboard';

/**
 * Only same-origin relative paths may be used as the post-login destination.
 * `new URL(next, origin)` would otherwise follow absolute URLs (`https://evil.com`)
 * and protocol-relative ones (`//evil.com`, `/\evil.com`) off-site — an open redirect.
 */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return DEFAULT_NEXT;
  }
  return next;
}
