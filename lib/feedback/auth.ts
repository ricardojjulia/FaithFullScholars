import { getSessionContext } from '@/lib/auth/session';

export interface StaffAuthResult {
  authorized: boolean;
  status: number;
  error?: string;
  user?: {
    id: string;
    email?: string;
    role: string;
  };
}

/**
 * Validates that the current request has an authenticated session
 * and holds the platform staff ('admin') role.
 *
 * The role is read from public.accounts (the same source RLS uses via
 * is_admin()), never from auth user_metadata, which the user can edit.
 */
export async function verifyStaffUser(): Promise<StaffAuthResult> {
  try {
    const session = await getSessionContext();

    if (!session) {
      return {
        authorized: false,
        status: 401,
        error: 'Unauthorized: Authentication required.',
      };
    }

    if (session.role !== 'admin') {
      return {
        authorized: false,
        status: 403,
        error: 'Forbidden: Platform staff role required.',
      };
    }

    return {
      authorized: true,
      status: 200,
      user: {
        id: session.userId,
        email: session.email,
        role: 'admin',
      },
    };
  } catch {
    return {
      authorized: false,
      status: 401,
      error: 'Unauthorized: Session check failed.',
    };
  }
}
