'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Facebook, Mail } from 'lucide-react'
import { friendlyError } from '@/lib/ui/errors'

type Mode = 'login' | 'signup'

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [providers, setProviders] = useState({ google: false, facebook: false })

  useEffect(() => {
    fetch('/api/auth/providers')
      .then((r) => r.json())
      .then((d) => setProviders({ google: !!d.google, facebook: !!d.facebook }))
      .catch(() => undefined)
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await signIn('credentials', {
        email,
        password,
        name: mode === 'signup' ? name : undefined,
        mode,
        redirect: false,
      })
      if (res?.error) {
        setError(
          res.error === 'EMAIL_EXISTS' || res.error.includes('EMAIL_EXISTS')
            ? 'An account with this email already exists. Log in instead.'
            : mode === 'signup'
              ? 'Could not create account. Check your name, email, and password.'
              : 'Email or password is incorrect.',
        )
        return
      }
      router.push('/')
      router.refresh()
    } catch (e) {
      setError(friendlyError(e, 'Something went wrong. Try again.'))
    } finally {
      setLoading(false)
    }
  }

  const social = async (provider: 'google' | 'facebook') => {
    setLoading(true)
    setError(null)
    await signIn(provider, { callbackUrl: '/' })
  }

  return (
    <div className="content-card stack auth-card">
      <div>
        <p className="kicker">{mode === 'signup' ? 'Create account' : 'Welcome back'}</p>
        <h1 className="section-title">{mode === 'signup' ? 'Sign up' : 'Log in'}</h1>
        <p className="section-sub">
          {mode === 'signup'
            ? 'Use Google, Facebook, or email. Then pick worker or customer on the home screen.'
            : 'Sign in with Google, Facebook, or email.'}
        </p>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        <button
          type="button"
          className="btn btn-outline btn-block social-btn"
          disabled={loading || !providers.google}
          onClick={() => social('google')}
          title={!providers.google ? 'Add AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET in .env' : undefined}
        >
          <GoogleIcon />
          Continue with Google
        </button>
        <button
          type="button"
          className="btn btn-outline btn-block social-btn"
          disabled={loading || !providers.facebook}
          onClick={() => social('facebook')}
          title={
            !providers.facebook ? 'Add AUTH_FACEBOOK_ID / AUTH_FACEBOOK_SECRET in .env' : undefined
          }
        >
          <Facebook size={18} color="#1877F2" />
          Continue with Facebook
        </button>
        {(!providers.google || !providers.facebook) && (
          <p className="muted" style={{ fontSize: 12, margin: 0 }}>
            Social login needs OAuth keys in `.env`. Email works now.
          </p>
        )}
      </div>

      <div className="auth-divider">
        <span>or email</span>
      </div>

      <form className="stack" onSubmit={onSubmit}>
        {mode === 'signup' && (
          <div>
            <label className="form-label" htmlFor="auth-name">
              Full name
            </label>
            <input
              id="auth-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ahmed Khan"
              required
              minLength={2}
              autoComplete="name"
            />
          </div>
        )}
        <div>
          <label className="form-label" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </div>

        {error && <p className="status-note error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          <Mail size={16} />
          {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
        </button>
      </form>

      <p className="auth-switch">
        {mode === 'signup' ? (
          <>
            Already have an account? <Link href="/login">Log in</Link>
          </>
        ) : (
          <>
            New here? <Link href="/signup">Create an account</Link>
          </>
        )}
      </p>

      <Link href="/" className="btn btn-ghost btn-block">
        Continue without account
      </Link>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.6 5.5-6.7 6.7l.1.1 6.2 5.2C36.9 41.1 44 36 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  )
}
