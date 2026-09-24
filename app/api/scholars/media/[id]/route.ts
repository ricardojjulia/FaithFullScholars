import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateMediaUrl } from '@/lib/media/showcase-service';
import { MediaType } from '@/lib/domain/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('media_links')
      .select('*')
      .eq('id', id)
      .eq('scholar_id', scholar.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Media link not found' }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length === 0) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      updates.title = body.title.trim();
    }

    if (body.description !== undefined) {
      updates.description = body.description ? body.description.trim() : null;
    }

    if (body.is_featured !== undefined) {
      updates.is_featured = Boolean(body.is_featured);
    }

    if (body.duration_seconds !== undefined) {
      updates.duration_seconds = body.duration_seconds ? Number(body.duration_seconds) : null;
    }

    if (body.url !== undefined || body.media_type !== undefined) {
      const targetUrl = body.url ?? existing.url;
      const targetType = body.media_type ?? existing.media_type;
      const validation = validateMediaUrl(targetUrl, targetType as MediaType);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error || 'Invalid media URL' }, { status: 400 });
      }
      updates.url = targetUrl.trim();
      updates.media_type = targetType;
      if (validation.thumbnailUrl) {
        updates.thumbnail_url = validation.thumbnailUrl;
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('media_links')
      .update(updates)
      .eq('id', id)
      .eq('scholar_id', scholar.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update media link' }, { status: 500 });
    }

    return NextResponse.json({ mediaLink: updated });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    const { error: deleteError } = await supabase
      .from('media_links')
      .delete()
      .eq('id', id)
      .eq('scholar_id', scholar.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete media link' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
