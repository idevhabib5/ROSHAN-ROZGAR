'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession as useAuthSession } from 'next-auth/react'
import { useSession } from '@/components/SessionProvider'
import { DEMO_IDS } from '@/lib/session'

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { session, patch } = useSession()
  const { data: auth } = useAuthSession()
  const isWelcome = pathname === '/'
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  const workerLinks = [
    { href: '/worker/home', label: 'Jobs' },
    { href: '/worker/onboarding', label: 'Profile' },
  ]
  const customerLinks = [
    { href: '/customer/home', label: 'Request' },
    { href: '/customer/workers', label: 'Workers' },
    { href: '/customer/chat', label: 'Messages' },
  ]

  const links =
    session.role === 'worker'
      ? workerLinks
      : session.role === 'customer'
        ? customerLinks
        : []

  const switchToWorker = () => {
    patch({
      role: 'worker',
      workerId: session.workerId || DEMO_IDS.workerAli,
    })
    router.push('/worker/home')
  }

  const switchToCustomer = () => {
    patch({
      role: 'customer',
      customerId: session.customerId || DEMO_IDS.customerAhmed,
    })
    router.push('/customer/home')
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand">
          <span className="brand-mark">RR</span>
          <span>
            <span className="brand-title">Roshan Rozgar</span>
            <span className="brand-sub">Good work. Brighter tomorrows.</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Primary">
          {auth?.user && (
            <span className="role-pill" title={auth.user.email || ''}>
              {auth.user.name || auth.user.email}
            </span>
          )}
          {session.role && (
            <span className="role-pill">
              {session.role === 'worker' ? 'Worker mode' : 'Customer mode'}
            </span>
          )}
          {!isWelcome &&
            !isAuthPage &&
            links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`site-nav-link${pathname.startsWith(l.href) ? ' active' : ''}`}
              >
                {l.label}
              </Link>
            ))}
          {!isWelcome && !isAuthPage && session.role === 'customer' && (
            <button
              type="button"
              className="site-nav-link site-nav-btn"
              onClick={switchToWorker}
              aria-label="Switch to worker mode"
            >
              Worker
            </button>
          )}
          {!isWelcome && !isAuthPage && session.role === 'worker' && (
            <button
              type="button"
              className="site-nav-link site-nav-btn"
              onClick={switchToCustomer}
              aria-label="Switch to customer mode"
            >
              Customer
            </button>
          )}
          {!isWelcome && !isAuthPage && !session.role && (
            <>
              <button type="button" className="site-nav-link site-nav-btn" onClick={switchToWorker}>
                Worker
              </button>
              <button type="button" className="site-nav-link site-nav-btn" onClick={switchToCustomer}>
                Customer
              </button>
            </>
          )}
          {!auth?.user && !isAuthPage && (
            <>
              <Link href="/login" className="site-nav-link">
                Log in
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm site-nav-cta">
                Sign up
              </Link>
            </>
          )}
          {auth?.user && (
            <button
              type="button"
              className="site-nav-link site-nav-btn"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              Log out
            </button>
          )}
          {!isWelcome && !isAuthPage && (
            <Link href="/" className="site-nav-link">
              Roles
            </Link>
          )}
          {isAuthPage && (
            <Link href="/" className="site-nav-link">
              Home
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
