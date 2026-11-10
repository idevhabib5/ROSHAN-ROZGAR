'use client'

import { DEMO_IDS, type DemoRole } from './session'

export type SessionState = {
  role: DemoRole | null
  workerId: string
  customerId: string
  pendingProfile: PendingProfile | null
  requestId: string | null
  selectedWorkerId: string | null
  quoteId: string | null
  bookingId: string | null
}

export type PendingProfile = {
  name: string | null
  trade: string | null
  experienceYears: number | null
  serviceArea: string | null
  visitChargePkr: number | null
  missingFields: string[]
  provider: string
  transcript: string
}

const KEY = 'rr_session_v1'

export const defaultSession = (): SessionState => ({
  role: null,
  workerId: DEMO_IDS.workerAli,
  customerId: DEMO_IDS.customerAhmed,
  pendingProfile: null,
  requestId: null,
  selectedWorkerId: null,
  quoteId: null,
  bookingId: null,
})

export function loadSession(): SessionState {
  if (typeof window === 'undefined') return defaultSession()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultSession()
    return { ...defaultSession(), ...JSON.parse(raw) }
  } catch {
    return defaultSession()
  }
}

export function saveSession(state: SessionState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export async function api<T>(
  path: string,
  init?: RequestInit & { session?: SessionState },
): Promise<T> {
  const session = init?.session || loadSession()
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (session.role) headers.set('x-demo-role', session.role)
  headers.set('x-demo-worker-id', session.workerId)
  headers.set('x-demo-customer-id', session.customerId)

  const res = await fetch(path, { ...init, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(data.error || 'Request failed'), {
      status: res.status,
      code: data.code,
      data,
    })
  }
  return data as T
}
