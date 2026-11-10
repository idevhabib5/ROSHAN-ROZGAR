'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, Home, MessageCircle, UserRound } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: typeof Home
  match: string
  exact?: boolean
}

export function BottomNav({ role }: { role: 'worker' | 'customer' }) {
  const pathname = usePathname()

  const items: NavItem[] =
    role === 'customer'
      ? [
          { href: '/customer/home', label: 'Request', icon: Home, match: '/customer/home' },
          { href: '/customer/workers', label: 'Workers', icon: Briefcase, match: '/customer/workers' },
          { href: '/customer/chat', label: 'Messages', icon: MessageCircle, match: '/customer/chat' },
          { href: '/choose-role', label: 'Role', icon: UserRound, match: '/choose-role' },
        ]
      : [
          { href: '/worker/home', label: 'Home', icon: Home, match: '/worker/home', exact: true },
          {
            href: '/worker/home#opportunities',
            label: 'Jobs',
            icon: Briefcase,
            match: '/worker/jobs',
          },
          {
            href: '/worker/onboarding',
            label: 'Profile',
            icon: UserRound,
            match: '/worker/onboarding',
          },
          { href: '/choose-role', label: 'Role', icon: UserRound, match: '/choose-role' },
        ]

  return (
    <nav
      className="bottom-nav"
      aria-label={role === 'customer' ? 'Customer navigation' : 'Worker navigation'}
    >
      {items.map(({ href, label, icon: Icon, match, exact }) => {
        const active = exact
          ? pathname === match
          : pathname === match || pathname.startsWith(`${match}/`)
        return (
          <Link
            key={`${label}-${href}`}
            href={href}
            className={`nav-item${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={2.2} aria-hidden />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
