import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateMediaUrl } from '@/lib/media/showcase-service';
import { MediaType } from '@/lib/domain/types';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: scholar, error: scholarError } = await supabase
      .from('scholars')
      .select('id')
      .eq('account_id', user.id)
      .single();

    if (scholarError || !scholar) {
      return NextResponse.json({ error: 'Scholar profile not found' }, { status: 404 });
    }

    const { data: mediaLinks, error: mediaError } = await supabase
      .from('media_links')
      .select('*')
      .eq('scholar_id', scholar.id)
      .order('display_order', { ascending: true });

    if (mediaError) {
      return NextResponse.json({ error: 'Failed to fetch media links' }, { status: 500 });
    }

    return NextResponse.json({ mediaLinks: mediaLinks || [] });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: scholar, error: scholarError } = await supabase
      .from('scholars')
      .select('id')
      .eq('account_id', user.id)
      .single();

    if (scholarError || !scholar) {
      return NextResponse.json({ error: 'Scholar profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const { title, media_type, url, description, is_featured, duration_seconds } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!media_type || !url) {
      return NextResponse.json({ error: 'Media type and URL are required' }, { status: 400 });
    }

    const validation = validateMediaUrl(url, media_type as MediaType);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid media URL' }, { status: 400 });
    }

    // Get max display order
    const { data: existing } = await supabase
      .from('media_links')
      .select('display_order')
      .eq('scholar_id', scholar.id)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? (existing[0].display_order ?? 0) + 1 : 0;

    const { data: inserted, error: insertError } = await supabase
      .from('media_links')
      .insert({
        scholar_id: scholar.id,
        title: title.trim(),
        media_type,
        url: url.trim(),
        description: description?.trim() || null,
        is_featured: Boolean(is_featured),
        thumbnail_url: validation.thumbnailUrl || null,
        duration_seconds: duration_seconds ? Number(duration_seconds) : null,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create media link' }, { status: 500 });
    }

    return NextResponse.json({ mediaLink: inserted }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
