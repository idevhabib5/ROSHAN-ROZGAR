'use client'

import { useCallback, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { CustomerFlowSteps } from '@/components/FlowSteps'
import { useSession } from '@/components/SessionProvider'
import { usePolling, useRealtime } from '@/hooks/useRealtime'
import { api } from '@/lib/client'
import { friendlyError } from '@/lib/ui/errors'

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
  no_workers: 'No workers nearby right now',
  cancelled: 'Request cancelled',
  expired: 'Request expired',
  assigned: 'Worker assigned',
}

const PHASE_HINT: Record<string, string> = {
  finding: 'We are looking for available workers near your area.',
  workers_notified: 'Nearby workers were notified. Offers will appear here.',
  expanding: 'Expanding the search radius to find more workers.',
  offers_received: 'Compare offers and choose a worker.',
  no_workers: 'Try again, change the area, or post later.',
  expired: 'This search timed out. You can retry.',
  cancelled: 'You cancelled this request.',
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
      load().catch((e) => setError(friendlyError(e)))
    }
  })

  usePolling(() => load().catch((e) => setError(friendlyError(e))), 2500, true)

  const cancel = async () => {
    setLoading(true)
    setError(null)
    try {
      await api(`/api/dispatch/sessions/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'cancel' }),
      })
      router.push('/customer/home')
    } catch (e) {
      setError(friendlyError(e, 'Could not cancel the request. Try again.'))
    } finally {
      setLoading(false)
    }
  }

  const retry = async () => {
    setLoading(true)
    setError(null)
    try {
      await api(`/api/dispatch/sessions/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'retry' }),
      })
      await load()
    } catch (e) {
      setError(friendlyError(e, 'Could not restart the search. Try again.'))
    } finally {
      setLoading(false)
    }
  }

  const phase = status?.phase || 'finding'
  const searching = !status || ['finding', 'workers_notified', 'expanding'].includes(phase)
  const canCancel = !['assigned', 'cancelled'].includes(phase)

  return (
    <div className="screen narrow">
      <div className="page-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => router.push('/customer/home')}
          aria-label="Back to request form"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="page-title">Finding nearby workers</h2>
      </div>

      <CustomerFlowSteps current="finding" />

      <div className="content-card stack" style={{ textAlign: 'center' }}>
        <div
          className={`search-status${searching ? ' pulse' : ''}`}
          aria-hidden
        >
          <Loader2 size={24} className={searching ? 'spin' : undefined} />
        </div>

        <div aria-live="polite" aria-atomic="true">
          <strong style={{ fontSize: 17 }}>{PHASE_LABEL[phase] || 'Searching'}</strong>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            {PHASE_HINT[phase] || 'Please wait while we update your request.'}
          </p>
        </div>

        <p className="muted" style={{ margin: 0 }}>
          {[status?.request.title || status?.request.trade, status?.request.location]
            .filter(Boolean)
            .join(' · ')}
          {status?.request.budgetPkr != null ? ` · Rs. ${status.request.budgetPkr}` : ''}
        </p>

        <div className="stat-grid" style={{ marginTop: 8 }}>
          <div className="stat-card">
            <div className="val">{status?.currentRadiusKm ?? '–'} km</div>
            <div className="lbl">Search radius</div>
          </div>
          <div className="stat-card">
            <div className="val">{status?.notifiedCount ?? 0}</div>
            <div className="lbl">Workers notified</div>
          </div>
          <div className="stat-card">
            <div className="val">{status?.offerCount ?? 0}</div>
            <div className="lbl">Offers received</div>
          </div>
        </div>

        {phase === 'no_workers' && (
          <div className="empty-state" style={{ padding: 16 }}>
            No available workers nearby right now. Retry the search or change your area and post
            again.
          </div>
        )}

        {error && (
          <p className="status-note error" role="alert">
            {error}
          </p>
        )}

        <div className="sticky-actions" style={{ marginTop: 8 }}>
          {(status?.offerCount ?? 0) > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => router.push(`/customer/offers/${requestId}`)}
            >
              View offers ({status?.offerCount})
            </button>
          )}
          {(phase === 'no_workers' || phase === 'expired') && (
            <button type="button" className="btn btn-secondary" disabled={loading} onClick={retry}>
              {loading ? 'Retrying…' : 'Retry search'}
            </button>
          )}
          {canCancel && (
            <button type="button" className="btn btn-outline" disabled={loading} onClick={cancel}>
              {loading ? 'Cancelling…' : 'Cancel request'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
