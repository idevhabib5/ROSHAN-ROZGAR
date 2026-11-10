'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, Home, MessageCircle, User } from 'lucide-react'

export function BottomNav({ role }: { role: 'worker' | 'customer' }) {
  const pathname = usePathname()
  const home = role === 'worker' ? '/worker/home' : '/customer/home'
  const items = [
    { href: home, label: 'Home', icon: Home },
    {
      href: role === 'worker' ? '/worker/home' : '/customer/workers',
      label: 'Jobs',
      icon: Briefcase,
    },
    {
      href: role === 'customer' ? '/customer/chat' : '/worker/home',
      label: 'Raabta',
      icon: MessageCircle,
    },
    { href: '/', label: 'Role', icon: User },
  ]

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href))
        return (
          <Link key={label} href={href} className={`nav-item${active ? ' active' : ''}`}>
            <Icon size={20} strokeWidth={2.2} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
