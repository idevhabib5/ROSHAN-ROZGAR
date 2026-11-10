'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  defaultSession,
  loadSession,
  saveSession,
  type PendingProfile,
  type SessionState,
} from '@/lib/client'
import type { DemoRole } from '@/lib/session'

type Ctx = {
  session: SessionState
  ready: boolean
  setRole: (role: DemoRole) => void
  setWorkerId: (id: string) => void
  setPendingProfile: (p: PendingProfile | null) => void
  patch: (partial: Partial<SessionState>) => void
  reset: () => void
}

const SessionContext = createContext<Ctx | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(defaultSession())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSession(loadSession())
    setReady(true)
  }, [])

  const persist = useCallback((updater: SessionState | ((prev: SessionState) => SessionState)) => {
    setSession((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveSession(next)
      return next
    })
  }, [])

  const value = useMemo<Ctx>(
    () => ({
      session,
      ready,
      setRole: (role) => persist((prev) => ({ ...prev, role })),
      setWorkerId: (workerId) => persist((prev) => ({ ...prev, workerId })),
      setPendingProfile: (pendingProfile) => persist((prev) => ({ ...prev, pendingProfile })),
      patch: (partial) => persist((prev) => ({ ...prev, ...partial })),
      reset: () => persist(defaultSession()),
    }),
    [session, ready, persist],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
