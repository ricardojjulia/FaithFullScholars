import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateSpeakerTopicInput } from '@/lib/speakers/types';

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

    const { data: topics, error: topicsError } = await supabase
      .from('speaker_topics')
      .select('*')
      .eq('scholar_id', scholar.id)
      .order('display_order', { ascending: true });

    if (topicsError) {
      return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 });
    }

    return NextResponse.json({ topics: topics || [] });
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
    const validation = validateSpeakerTopicInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { data: newTopic, error: insertError } = await supabase
      .from('speaker_topics')
      .insert({
        scholar_id: scholar.id,
        title: body.title.trim(),
        description: body.description.trim(),
        target_audience: body.target_audience || 'academic',
        sample_media_url: body.sample_media_url ? body.sample_media_url.trim() : null,
        is_featured: Boolean(body.is_featured),
        display_order: typeof body.display_order === 'number' ? body.display_order : 0,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 });
    }

    return NextResponse.json({ topic: newTopic }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get('id');

    if (!topicId) {
      return NextResponse.json({ error: 'Topic ID is required' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('speaker_topics')
      .delete()
      .eq('id', topicId)
      .eq('scholar_id', scholar.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
