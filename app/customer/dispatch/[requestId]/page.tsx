'use client'

import { useCallback, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useSession } from '@/components/SessionProvider'
import { usePolling, useRealtime } from '@/hooks/useRealtime'
import { api } from '@/lib/client'

type DispatchStatus = {
  requestId: string
  status: string
  phase: string
  currentRadiusKm: number
  notifiedCount: number
  offerCount: number
  nextExpandAt: string | null
  expiresAt: string
  request: {
    title: string | null
    trade: string
    location: string
    budgetPkr: number | null
  }
}

const PHASE_LABEL: Record<string, string> = {
  finding: 'Finding nearby workers',
  workers_notified: 'Workers notified. Waiting for offers.',
  offers_received: 'Offers received',
  expanding: 'Expanding search area',
  no_workers: 'No workers nearby',
  cancelled: 'Request cancelled',
  expired: 'Request expired',
  assigned: 'Worker assigned',
}

export default function DispatchWaitingPage() {
  const { requestId } = useParams<{ requestId: string }>()
  const router = useRouter()
  const { patch } = useSession()
  const [status, setStatus] = useState<DispatchStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const data = await api<DispatchStatus>(`/api/dispatch/sessions/${requestId}`)
    setStatus(data)
    patch({ requestId })
    if (data.offerCount > 0) {
      router.replace(`/customer/offers/${requestId}`)
    }
  }, [requestId, patch, router])

  useRealtime((event) => {
    if (
      event === 'offer:received' ||
      event === 'dispatch:radius_expanded' ||
      event === 'dispatch:no_workers' ||
      event === 'dispatch:started'
    ) {
      load().catch((e) => setError(e.message))
    }
  })

  usePolling(() => load().catch((e) => setError(e.message)), 2500, true)

  const cancel = async () => {
    setLoading(true)
    try {
      await api(`/api/dispatch/sessions/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'cancel' }),
      })
      router.push('/customer/home')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const retry = async () => {
    setLoading(true)
    try {
      await api(`/api/dispatch/sessions/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'retry' }),
      })
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const searching = !status || ['finding', 'workers_notified', 'expanding'].includes(status.phase)

  return (
    <div className="screen narrow">
      <div className="page-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => router.push('/customer/home')}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="page-title">Finding nearby workers</h2>
      </div>

      <div className="content-card stack" style={{ textAlign: 'center' }}>
        <div className={`search-status${searching ? ' pulse' : ''}`} aria-hidden>
          <Loader2 size={24} className={searching ? 'spin' : undefined} />
        </div>

        <strong style={{ fontSize: 17 }}>
          {PHASE_LABEL[status?.phase || 'finding'] || 'Searching'}
        </strong>
        <p className="muted" style={{ margin: 0 }}>
          {[status?.request.title || status?.request.trade, status?.request.location]
            .filter(Boolean)
            .join(' · ')}
          {status?.request.budgetPkr != null ? ` · Rs. ${status.request.budgetPkr}` : ''}
        </p>

        <div className="stat-grid" style={{ marginTop: 8 }}>
          <div className="stat-card">
            <div className="val">{status?.currentRadiusKm ?? '–'} km</div>
            <div className="lbl">Radius</div>
          </div>
          <div className="stat-card">
            <div className="val">{status?.notifiedCount ?? 0}</div>
            <div className="lbl">Notified</div>
          </div>
          <div className="stat-card">
            <div className="val">{status?.offerCount ?? 0}</div>
            <div className="lbl">Offers</div>
          </div>
        </div>

        {status?.phase === 'no_workers' && (
          <div className="empty-state" style={{ padding: 16 }}>
            No available workers in this area. Retry or try a different time.
          </div>
        )}

        {error && <p className="status-note error">{error}</p>}

        <div className="sticky-actions" style={{ marginTop: 8 }}>
          {(status?.offerCount ?? 0) > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => router.push(`/customer/offers/${requestId}`)}
            >
              View offers
            </button>
          )}
          {(status?.phase === 'no_workers' || status?.phase === 'expired') && (
            <button type="button" className="btn btn-secondary" disabled={loading} onClick={retry}>
              Retry search
            </button>
          )}
          <button type="button" className="btn btn-outline" disabled={loading} onClick={cancel}>
            Cancel request
          </button>
        </div>
      </div>
    </div>
  )
}
