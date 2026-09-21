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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a valid JSON object' }, { status: 400 });
    }

    const validation = validateSpeakerTopicInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const insertData: Record<string, unknown> = {
      scholar_id: scholar.id,
      title: body.title.trim(),
      description: body.description.trim(),
      target_audience: body.target_audience || 'academic',
      sample_media_url: body.sample_media_url ? body.sample_media_url.trim() : null,
      is_featured: Boolean(body.is_featured),
      display_order: typeof body.display_order === 'number' ? body.display_order : 0,
    };

    if (
      typeof body.id === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)
    ) {
      insertData.id = body.id;
    }

    const { data: newTopic, error: insertError } = await supabase
      .from('speaker_topics')
      .insert(insertData)
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

export async function PATCH(req: NextRequest) {
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a valid JSON object' }, { status: 400 });
    }

    // Support batch reorder
    if (Array.isArray(body.reorder)) {
      if (body.reorder.length === 0) {
        return NextResponse.json({ error: 'Reorder payload cannot be empty' }, { status: 400 });
      }

      for (const item of body.reorder) {
        if (
          !item ||
          typeof item !== 'object' ||
          !item.id ||
          typeof item.display_order !== 'number' ||
          !Number.isInteger(item.display_order)
        ) {
          return NextResponse.json(
            { error: 'Each reorder item must have an id and integer display_order' },
            { status: 400 }
          );
        }
      }

      for (const item of body.reorder) {
        const { error: updateError } = await supabase
          .from('speaker_topics')
          .update({ display_order: item.display_order })
          .eq('id', item.id)
          .eq('scholar_id', scholar.id);

        if (updateError) {
          return NextResponse.json({ error: 'Failed to update topic display order' }, { status: 500 });
        }
      }
      return NextResponse.json({ success: true });
    }

    // Support single topic update
    if (!body.id) {
      return NextResponse.json({ error: 'Topic ID is required' }, { status: 400 });
    }

    // Validate any present content fields on every PATCH path (including sample_media_url safety)
    if (
      body.title !== undefined ||
      body.description !== undefined ||
      body.target_audience !== undefined ||
      body.sample_media_url !== undefined ||
      body.display_order !== undefined ||
      body.is_featured !== undefined
    ) {
      const validation = validateSpeakerTopicInput({
        title: body.title !== undefined ? body.title : 'Valid Partial Update Title',
        description: body.description !== undefined ? body.description : 'Valid Partial Update Abstract Content',
        target_audience: body.target_audience,
        sample_media_url: body.sample_media_url,
        display_order: body.display_order,
        is_featured: body.is_featured,
      });
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    const updatePayload: Record<string, unknown> = {};
    if (typeof body.title === 'string') updatePayload.title = body.title.trim();
    if (typeof body.description === 'string') updatePayload.description = body.description.trim();
    if (typeof body.target_audience === 'string') updatePayload.target_audience = body.target_audience;
    if (body.sample_media_url !== undefined) {
      updatePayload.sample_media_url =
        body.sample_media_url && typeof body.sample_media_url === 'string'
          ? body.sample_media_url.trim()
          : null;
    }
    if (typeof body.is_featured === 'boolean') updatePayload.is_featured = body.is_featured;
    if (typeof body.display_order === 'number') updatePayload.display_order = body.display_order;

    const { data: updatedTopic, error: updateError } = await supabase
      .from('speaker_topics')
      .update(updatePayload)
      .eq('id', body.id)
      .eq('scholar_id', scholar.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update topic' }, { status: 500 });
    }

    return NextResponse.json({ topic: updatedTopic });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
