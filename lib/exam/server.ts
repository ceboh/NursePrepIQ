// Server-only helpers for the exam API routes. The service-role key is read from the
// environment and is never sent to the browser; it lets the server read answer keys and write
// scores, which students cannot do through row-level security.
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import type { ExamForm, Track } from './blueprint';

export class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly details?: unknown) {
    super(message);
  }
}

export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new HttpError(503, 'The practice exam service is not configured yet.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireUser(req: NextRequest): Promise<User> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Please sign in again.');
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) throw new HttpError(401, 'Your session could not be verified. Please sign in again.');
  return user;
}

// Exam responses must never be cached by the browser or a proxy.
export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return json({ error: e.message, details: e.details }, e.status);
  console.error('exam api error', e);
  return json({ error: 'Something went wrong with the practice exam. Please try again.' }, 500);
}

// PostgREST returns at most 1,000 rows per request.
export async function selectAll<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return rows;
  }
}

export type SessionRow = {
  id: string;
  user_id: string;
  track: Track;
  form: ExamForm;
  status: 'in_progress' | 'paused' | 'submitted' | 'expired';
  started_at: string;
  time_limit_seconds: number;
  elapsed_seconds: number;
  last_resumed_at: string | null;
  submitted_at: string | null;
  seed: string;
  item_count: number;
  current_position: number;
  assembly: unknown;
  score_summary: unknown;
};

export const SESSION_COLUMNS = 'id,user_id,track,form,status,started_at,time_limit_seconds,elapsed_seconds,last_resumed_at,submitted_at,seed,item_count,current_position,assembly,score_summary';

// Time used so far: stored time plus the running clock while the exam is in progress.
export function elapsedNow(s: Pick<SessionRow, 'status' | 'elapsed_seconds' | 'last_resumed_at'>, now = Date.now()) {
  const running = s.status === 'in_progress' && s.last_resumed_at ? Math.max(0, Math.floor((now - Date.parse(s.last_resumed_at)) / 1000)) : 0;
  return s.elapsed_seconds + running;
}

export const remainingSeconds = (s: SessionRow, now = Date.now()) => Math.max(0, s.time_limit_seconds - elapsedNow(s, now));

// Loads a session the signed-in student owns and the server assembled.
export async function loadSession(db: SupabaseClient, id: string, userId: string): Promise<SessionRow> {
  const { data, error } = await db.from('exam_sessions').select(SESSION_COLUMNS).eq('id', id).eq('user_id', userId).not('assembly', 'is', null).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new HttpError(404, 'This practice exam was not found.');
  return data as SessionRow;
}
