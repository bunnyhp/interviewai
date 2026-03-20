import { NextResponse } from 'next/server';
import { createSession, listSessions } from '@/lib/db';

// GET /api/sessions — List all sessions
export async function GET() {
  try {
    const sessions = await listSessions();
    return NextResponse.json({ sessions });
  } catch (e) {
    console.error('Failed to list sessions:', e);
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
}

// POST /api/sessions — Create a new session
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { resumeText, jobDescription, roleTitle, companyName, companyResearch, systemPrompt, aiModel } = body;

    if (!resumeText || !jobDescription || !roleTitle || !companyName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = await createSession({
      resumeText,
      jobDescription,
      roleTitle,
      companyName,
      companyResearch: companyResearch || '',
      systemPrompt: systemPrompt || '',
      aiModel: aiModel || 'gpt-4o',
    });

    return NextResponse.json({ id });
  } catch (e) {
    console.error('Failed to create session:', e);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
