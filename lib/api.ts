import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export function jsonOk<T>(data: T, init?: number | ResponseInit) {
  const status = typeof init === 'number' ? init : init?.status ?? 200
  const rest = typeof init === 'number' ? undefined : init
  return NextResponse.json(data, { ...rest, status })
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

export function handleRouteError(err: unknown) {
  if (err instanceof ZodError) {
    return jsonError('Validation failed', 400, { issues: err.issues })
  }
  const e = err as { message?: string; status?: number; code?: string }
  if (e?.status) {
    return jsonError(e.message || 'Request failed', e.status, e.code ? { code: e.code } : undefined)
  }
  console.error(err)
  return jsonError('Internal server error', 500)
}
