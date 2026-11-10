'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession as useAuthSession } from 'next-auth/react'
import { Menu, X } from 'lucide-react'
import { useSession } from '@/components/SessionProvider'
import { DEMO_IDS } from '@/lib/session'

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { session, patch } = useSession()
  const { data: auth } = useAuthSession()
  const [menuOpen, setMenuOpen] = useState(false)
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

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const switchToWorker = () => {
    patch({
      role: 'worker',
      workerId: session.workerId || DEMO_IDS.workerAli,
    })
    setMenuOpen(false)
    router.push('/worker/home')
  }

  const switchToCustomer = () => {
    patch({
      role: 'customer',
      customerId: session.customerId || DEMO_IDS.customerAhmed,
    })
    setMenuOpen(false)
    router.push('/customer/home')
  }

  const navBody = (
    <>
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
            onClick={() => setMenuOpen(false)}
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
          <Link href="/login" className="site-nav-link" onClick={() => setMenuOpen(false)}>
            Log in
          </Link>
          <Link
            href="/signup"
            className="btn btn-primary btn-sm site-nav-cta"
            onClick={() => setMenuOpen(false)}
          >
            Sign up
          </Link>
        </>
      )}
      {auth?.user && (
        <button
          type="button"
          className="site-nav-link site-nav-btn"
          onClick={() => {
            setMenuOpen(false)
            void signOut({ callbackUrl: '/' })
          }}
        >
          Log out
        </button>
      )}
      {!isWelcome && !isAuthPage && (
        <Link href="/" className="site-nav-link" onClick={() => setMenuOpen(false)}>
          Roles
        </Link>
      )}
      {isAuthPage && (
        <Link href="/" className="site-nav-link" onClick={() => setMenuOpen(false)}>
          Home
        </Link>
      )}
    </>
  )

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">RR</span>
          <span className="site-brand-text">
            <span className="brand-title">Roshan Rozgar</span>
            <span className="brand-sub">Good work. Brighter tomorrows.</span>
          </span>
        </Link>

        <div className="header-actions">
          {!auth?.user && !isAuthPage && (
            <Link href="/signup" className="btn btn-primary btn-sm site-nav-cta header-signup-mobile">
              Sign up
            </Link>
          )}
          <button
            type="button"
            className="menu-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <nav className="site-nav site-nav-desktop" aria-label="Primary">
          {navBody}
        </nav>
      </div>

      {menuOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}
      <nav
        id="mobile-nav"
        className={`mobile-nav${menuOpen ? ' open' : ''}`}
        aria-label="Mobile"
        hidden={!menuOpen}
      >
        {navBody}
      </nav>
    </header>
  )
}
