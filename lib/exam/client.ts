// Browser helpers for the exam pages: authenticated calls to the exam API.
import { createClient } from '@/lib/supabase/client';

export class ExamApiError extends Error {
  constructor(message: string, readonly status: number, readonly details?: unknown) {
    super(message);
  }
}

export async function examApi<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown; keepalive?: boolean } = {}): Promise<T> {
  const { data: { session } } = await createClient().auth.getSession();
  const res = await fetch(path, {
    method: init.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token ?? '') },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    keepalive: init.keepalive,
    cache: 'no-store',
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new ExamApiError(j.error || 'Something went wrong. Please try again.', res.status, j.details);
  return j as T;
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

export function formatDuration(seconds: number) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}
