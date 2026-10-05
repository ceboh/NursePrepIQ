// GET  /api/exam/:id                     current state and the current item (no answer keys)
// POST /api/exam/:id { action: 'answer', position, response } | { action: 'pause' | 'resume' | 'end' }
import type { NextRequest } from 'next/server';
import { answer, endEarly, examState, pause, resume } from '@/lib/exam/delivery';
import { adminClient, errorResponse, HttpError, json, loadSession, requireUser } from '@/lib/exam/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Ctx = { params: Promise<{ id: string }> };

async function session(req: NextRequest, ctx: Ctx) {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  if (!UUID.test(id)) throw new HttpError(404, 'This practice exam was not found.');
  const db = adminClient();
  return { db, s: await loadSession(db, id, user.id) };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { db, s } = await session(req, ctx);
    return json(await examState(db, s));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { db, s } = await session(req, ctx);
    const body = await req.json().catch(() => ({}));
    switch (body?.action) {
      case 'answer':
        if (!Number.isInteger(body.position)) throw new HttpError(400, 'Missing question position.');
        return json(await answer(db, s, body.position, body.response));
      case 'pause': return json(await pause(db, s));
      case 'resume': return json(await resume(db, s));
      case 'end': return json(await endEarly(db, s));
      default: throw new HttpError(400, 'Unknown exam action.');
    }
  } catch (e) {
    return errorResponse(e);
  }
}
