'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession as useAuthSession } from 'next-auth/react'
import { HardHat, Home } from 'lucide-react'
import { useSession } from '@/components/SessionProvider'

type RoleChoice = 'worker' | 'customer'

type MeResponse = {
  preferredRole?: string | null
  workerId?: string | null
  customerId?: string | null
}

export default function ChooseRolePage() {
  const router = useRouter()
  const { data: auth, status } = useAuthSession()
  const { patch } = useSession()
  const [role, setRole] = useState<RoleChoice | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
      return
    }
    if (status !== 'authenticated') return

    let cancelled = false
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((me: MeResponse | null) => {
        if (cancelled || !me) return
        if (me.preferredRole === 'worker' && me.workerId) {
          patch({ role: 'worker', workerId: me.workerId })
          router.replace('/worker/home')
          return
        }
        if (me.preferredRole === 'customer' && me.customerId) {
          patch({ role: 'customer', customerId: me.customerId })
          router.replace('/customer/home')
          return
        }
        if (me.preferredRole === 'worker' || me.preferredRole === 'customer') {
          setRole(me.preferredRole)
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setChecking(false)
      })

    return () => {
      cancelled = true
    }
  }, [status, patch, router])

  const continueSetup = async () => {
    if (!role) {
      setError('Choose a role to continue.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredRole: role }),
      })
      const me = (await fetch('/api/me').then((r) => (r.ok ? r.json() : null))) as MeResponse | null

      if (role === 'worker') {
        patch({ role: 'worker', pendingProfile: null })
        if (me?.workerId) {
          patch({ workerId: me.workerId })
          router.push('/worker/home')
          return
        }
        router.push('/worker/onboarding')
        return
      }

      patch({ role: 'customer' })
      if (me?.customerId) {
        patch({ customerId: me.customerId })
        router.push('/customer/home')
        return
      }
      router.push('/customer/onboarding')
    } catch {
      setError('Could not save your choice. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || checking) {
    return (
      <div className="auth-screen">
        <div className="auth-panel">
          <div className="content-card auth-card">
            <p className="muted" style={{ margin: 0 }}>
              Loading setup…
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark">RR</span>
          <div>
            <strong>Roshan Rozgar</strong>
            <p>
              {auth?.user?.name || auth?.user?.email
                ? `Signed in as ${auth.user.name || auth.user.email}`
                : 'Complete a short setup'}
            </p>
          </div>
        </div>

        <div className="content-card stack auth-card">
          <div>
            <p className="kicker">Step 1 of 2</p>
            <h1 className="section-title">How will you use Roshan Rozgar?</h1>
            <p className="section-sub">
              Pick one. Next, Roshan Assistant collects your details by voice and asks again if
              anything is missing.
            </p>
          </div>

          <div className="role-choice-list" role="radiogroup" aria-label="Account role">
            <button
              type="button"
              role="radio"
              aria-checked={role === 'worker'}
              className={`role-choice${role === 'worker' ? ' selected' : ''}`}
              onClick={() => {
                setRole('worker')
                setError(null)
              }}
            >
              <span className="role-choice-icon">
                <HardHat size={22} />
              </span>
              <span className="role-choice-copy">
                <strong>Worker</strong>
                <span>Offer skills nearby</span>
              </span>
              <span className="role-choice-radio" aria-hidden />
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={role === 'customer'}
              className={`role-choice${role === 'customer' ? ' selected' : ''}`}
              onClick={() => {
                setRole('customer')
                setError(null)
              }}
            >
              <span className="role-choice-icon">
                <Home size={22} />
              </span>
              <span className="role-choice-copy">
                <strong>Customer</strong>
                <span>Find a nearby worker</span>
              </span>
              <span className="role-choice-radio" aria-hidden />
            </button>
          </div>

          {error && <p className="status-note error">{error}</p>}

          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!role || loading}
            onClick={() => void continueSetup()}
          >
            {loading ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
