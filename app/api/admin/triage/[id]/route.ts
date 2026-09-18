import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffUser } from '@/lib/feedback/auth';
import { updateTriageRecord } from '@/lib/feedback/store';
import { TriageAction, TRIAGE_ACTIONS } from '@/lib/feedback/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  // 1. Authenticate and enforce staff/admin authorization
  const auth = await verifyStaffUser();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: 'Missing feedback record ID.' },
      { status: 400 }
    );
  }

  // 2. Validate input payload
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Malformed JSON payload.' },
      { status: 400 }
    );
  }

  const { processed, action } = body;

  const updates: {
    processed?: boolean;
    action?: TriageAction | null;
  } = {};

  if (typeof processed === 'boolean') {
    updates.processed = processed;
  }

  if (action !== undefined) {
    if (action === null) {
      updates.action = null;
    } else if (
      typeof action === 'string' &&
      TRIAGE_ACTIONS.includes(action as TriageAction)
    ) {
      updates.action = action as TriageAction;
    } else {
      return NextResponse.json(
        {
          error: `Invalid action. Allowed values: ${TRIAGE_ACTIONS.join(
            ', '
          )} or null.`,
        },
        { status: 400 }
      );
    }
  }

  try {
    const updatedRecord = await updateTriageRecord(id, updates);
    return NextResponse.json({ success: true, record: updatedRecord });
  } catch (err) {
    console.error(`Failed to update triage record ${id}:`, err);
    return NextResponse.json(
      { error: 'Failed to update triage record.' },
      { status: 500 }
    );
  }
}
