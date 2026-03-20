import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface StoredSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  resumeText: string;
  jobDescription: string;
  roleTitle: string;
  companyName: string;
  companyResearch: string;
  systemPrompt: string;
  aiModel: string;
  history: Array<{
    id: string;
    question: string;
    answer: string;
    timestamp: string;
  }>;
}

const SESSION_PREFIX = 'session:';
const SESSION_INDEX = 'sessions:index';
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days

export async function createSession(
  data: Omit<StoredSession, 'id' | 'createdAt' | 'updatedAt' | 'history'>
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const session: StoredSession = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
    history: [],
  };

  // Store session data
  await redis.set(`${SESSION_PREFIX}${id}`, JSON.stringify(session), { ex: SESSION_TTL });

  // Add to session index (sorted set by creation time)
  await redis.zadd(SESSION_INDEX, { score: Date.now(), member: id });

  return id;
}

export async function getSession(id: string): Promise<StoredSession | null> {
  const data = await redis.get<string>(`${SESSION_PREFIX}${id}`);
  if (!data) return null;

  // data could be a string or already parsed object depending on Upstash client version
  if (typeof data === 'string') {
    return JSON.parse(data) as StoredSession;
  }
  return data as unknown as StoredSession;
}

export async function updateSessionHistory(
  id: string,
  newPair: { id: string; question: string; answer: string; timestamp: string }
): Promise<boolean> {
  const session = await getSession(id);
  if (!session) return false;

  session.history.push(newPair);
  session.updatedAt = new Date().toISOString();

  await redis.set(`${SESSION_PREFIX}${id}`, JSON.stringify(session), { ex: SESSION_TTL });
  return true;
}

export async function listSessions(): Promise<
  Array<{
    id: string;
    roleTitle: string;
    companyName: string;
    aiModel: string;
    createdAt: string;
    updatedAt: string;
    questionCount: number;
  }>
> {
  // Get all session IDs from the sorted set (newest first)
  const ids = await redis.zrange(SESSION_INDEX, 0, -1, { rev: true });

  if (!ids || ids.length === 0) return [];

  const sessions: Array<{
    id: string;
    roleTitle: string;
    companyName: string;
    aiModel: string;
    createdAt: string;
    updatedAt: string;
    questionCount: number;
  }> = [];

  // Fetch each session (could use pipeline for better perf, but fine for now)
  for (const id of ids) {
    const session = await getSession(id as string);
    if (session) {
      sessions.push({
        id: session.id,
        roleTitle: session.roleTitle,
        companyName: session.companyName,
        aiModel: session.aiModel,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        questionCount: session.history.length,
      });
    }
  }

  return sessions;
}

export async function deleteSession(id: string): Promise<boolean> {
  await redis.del(`${SESSION_PREFIX}${id}`);
  await redis.zrem(SESSION_INDEX, id);
  return true;
}
