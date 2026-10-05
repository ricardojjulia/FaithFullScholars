import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_NEXT, safeNextPath } from '@/lib/auth/redirect';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = safeNextPath(requestUrl.searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = new URL(next, requestUrl.origin);
      // Defence in depth: never leave the site, whatever the parser did.
      if (destination.origin === requestUrl.origin) {
        return NextResponse.redirect(destination);
      }
      return NextResponse.redirect(new URL(DEFAULT_NEXT, requestUrl.origin));
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', requestUrl.origin));
}
