import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import { tickDispatchSessions } from '@/lib/dispatch/session'

export async function POST(req: Request) {
  try {
    const secret = req.headers.get('x-dispatch-tick-secret')
    const expected = process.env.DISPATCH_TICK_SECRET || 'local-dev-tick'
    if (secret !== expected) return jsonError('Forbidden', 403)
    await tickDispatchSessions()
    return jsonOk({ ok: true, at: new Date().toISOString() })
  } catch (err) {
    return handleRouteError(err)
  }
}
