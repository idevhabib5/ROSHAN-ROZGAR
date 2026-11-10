'use client'

import Link from 'next/link'
import { useSession } from '@/components/SessionProvider'
import { DEMO_IDS } from '@/lib/session'

/** Small helper strip so judges can switch roles mid-demo without losing context */
export function DemoBridge({
  hint,
  workerHref,
  customerHref,
}: {
  hint: string
  workerHref?: string
  customerHref?: string
}) {
  const { patch, session } = useSession()

  return (
    <div className="card-soft" style={{ marginTop: 16 }}>
      <strong style={{ fontSize: 13 }}>Demo bridge</strong>
      <p className="muted" style={{ margin: '6px 0 12px', fontSize: 12 }}>
        {hint}
      </p>
      <p className="muted" style={{ margin: '0 0 10px', fontSize: 11 }}>
        Current: {session.role || 'none'} · keeps request/booking ids in this browser
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Link
          href={workerHref || '/worker/home'}
          className="btn btn-outline btn-sm"
          onClick={() =>
            patch({
              role: 'worker',
              workerId: session.workerId || DEMO_IDS.workerAli,
            })
          }
        >
          Open as Worker
        </Link>
        <Link
          href={customerHref || '/customer/home'}
          className="btn btn-secondary btn-sm"
          onClick={() =>
            patch({
              role: 'customer',
              customerId: session.customerId || DEMO_IDS.customerAhmed,
            })
          }
        >
          Open as Customer
        </Link>
      </div>
    </div>
  )
}
