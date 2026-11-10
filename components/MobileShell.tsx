import type { ReactNode } from 'react'

export function MobileShell({ children }: { children: ReactNode }) {
  return <div className="phone-shell">{children}</div>
}
