import { NextResponse } from 'next/server';
import { getSession, updateSessionHistory, deleteSession } from '@/lib/db';

// GET /api/sessions/[id] — Get a session by ID
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(params.id);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json({ session });
  } catch (e) {
    console.error('Failed to get session:', e);
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 });
  }
}

// PUT /api/sessions/[id] — Add a Q&A pair to the session
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { qaPair } = body;

    if (!qaPair || !qaPair.question || !qaPair.answer) {
      return NextResponse.json({ error: 'Missing Q&A pair' }, { status: 400 });
    }

    const success = await updateSessionHistory(params.id, {
      id: qaPair.id,
      question: qaPair.question,
      answer: qaPair.answer,
      timestamp: qaPair.timestamp || new Date().toISOString(),
    });

    if (!success) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Failed to update session:', e);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

// DELETE /api/sessions/[id] — Delete a session
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteSession(params.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Failed to delete session:', e);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
