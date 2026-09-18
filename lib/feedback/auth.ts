import { createClient } from '@/lib/supabase/server';

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
 */
export async function verifyStaffUser(): Promise<StaffAuthResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        authorized: false,
        status: 401,
        error: 'Unauthorized: Authentication required.',
      };
    }

    const role = user.app_metadata?.role || user.user_metadata?.role;
    if (role !== 'admin') {
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
        id: user.id,
        email: user.email,
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
