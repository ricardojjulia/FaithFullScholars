import type { RevisionState } from '@/lib/profiles/revision-service';
import type { RevisionSnapshotData, ScholarProfileRevision } from '@/lib/domain/types';

export type { RevisionState };

export type RevisionApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; errors: string[] };

const NETWORK_ERROR = 'Network error. Check your connection and try again.';

async function call<T>(url: string, init?: RequestInit): Promise<RevisionApiResult<T>> {
  try {
    const res = await fetch(url, { cache: 'no-store', ...init });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    const obj = (body && typeof body === 'object' ? body : {}) as { error?: unknown; errors?: unknown };
    if (!res.ok) {
      const errors = Array.isArray(obj.errors) ? obj.errors.filter((e): e is string => typeof e === 'string') : [];
      return {
        ok: false,
        status: res.status,
        error: typeof obj.error === 'string' ? obj.error : 'Unable to process the request. Please try again.',
        errors
      };
    }
    return { ok: true, status: res.status, data: body as T };
  } catch {
    return { ok: false, status: 0, error: NETWORK_ERROR, errors: [] };
  }
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export function fetchRevisionState() {
  return call<RevisionState>('/api/scholars/revisions');
}

export function saveRevision(snapshot: RevisionSnapshotData, revisionId?: string) {
  return call<{ revision: ScholarProfileRevision }>(
    '/api/scholars/revisions',
    jsonInit('PUT', revisionId ? { snapshot, revisionId } : { snapshot })
  );
}

export function submitRevision(revisionId?: string) {
  return call<{ revision: ScholarProfileRevision }>(
    '/api/scholars/revisions/submit',
    jsonInit('POST', revisionId ? { revisionId } : {})
  );
}

export function withdrawRevision(revisionId?: string) {
  return call<{ revision: ScholarProfileRevision }>(
    '/api/scholars/revisions/withdraw',
    jsonInit('POST', revisionId ? { revisionId } : {})
  );
}

/** Human-readable message for a failed call, including per-field validation errors. */
export function describeFailure(result: { error: string; errors: string[] }): string {
  return result.errors.length > 0 ? `${result.error} ${result.errors.join(' ')}` : result.error;
}
