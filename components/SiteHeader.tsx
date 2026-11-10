'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from '@/components/SessionProvider'
import { DEMO_IDS } from '@/lib/session'

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { session, patch } = useSession()
  const isWelcome = pathname === '/'

  const workerLinks = [
    { href: '/worker/home', label: 'My Work' },
    { href: '/worker/onboarding', label: 'Voice Profile' },
  ]
  const customerLinks = [
    { href: '/customer/home', label: 'Need Help' },
    { href: '/customer/workers', label: 'Find Help' },
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
          {session.role && (
            <span className="role-pill">
              {session.role === 'worker' ? 'Worker mode' : 'Customer mode'}
            </span>
          )}
          {!isWelcome &&
            links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`site-nav-link${pathname.startsWith(l.href) ? ' active' : ''}`}
              >
                {l.label}
              </Link>
            ))}
          {!isWelcome && session.role === 'customer' && (
            <button type="button" className="site-nav-link site-nav-btn" onClick={switchToWorker}>
              → Worker
            </button>
          )}
          {!isWelcome && session.role === 'worker' && (
            <button type="button" className="site-nav-link site-nav-btn" onClick={switchToCustomer}>
              → Customer
            </button>
          )}
          <Link href="/" className="site-nav-link">
            {isWelcome ? 'Start' : 'Roles'}
          </Link>
        </nav>
      </div>
    </header>
  )
}
