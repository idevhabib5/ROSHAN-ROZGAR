'use client'

import { useCallback, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Radar } from 'lucide-react'
import { DemoBridge } from '@/components/DemoBridge'
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

  const phaseLabel: Record<string, string> = {
    finding: 'Finding nearby workers…',
    workers_notified: 'Workers notified — waiting for responses',
    offers_received: 'Offers received',
    expanding: 'Expanding search area…',
    no_workers: 'No workers available in current radius',
    cancelled: 'Request cancelled',
    expired: 'Request expired',
    assigned: 'Worker assigned',
  }

  return (
    <div className="screen narrow">
      <div className="page-header">
        <button type="button" className="back-btn" onClick={() => router.push('/customer/home')}>
          <ArrowLeft size={18} />
        </button>
        <h2>Finding skilled workers near you</h2>
      </div>

      <div className="content-card stack" style={{ textAlign: 'center' }}>
        <div className="radar-wrap">
          <div className="radar-ring" />
          <div className="radar-ring delay" />
          <div className="radar-core">
            <Radar size={28} />
          </div>
        </div>

        <strong style={{ fontSize: 18 }}>
          {phaseLabel[status?.phase || 'finding'] || 'Searching…'}
        </strong>
        <p className="muted" style={{ margin: 0 }}>
          {status?.request.title || status?.request.trade} · {status?.request.location}
          {status?.request.budgetPkr != null ? ` · Budget Rs. ${status.request.budgetPkr}` : ''}
        </p>

        <div className="stat-grid" style={{ marginTop: 8 }}>
          <div className="stat-card">
            <div className="val">{status?.currentRadiusKm ?? '—'} km</div>
            <div className="lbl">Search radius</div>
          </div>
          <div className="stat-card">
            <div className="val">{status?.notifiedCount ?? 0}</div>
            <div className="lbl">Workers notified</div>
          </div>
          <div className="stat-card">
            <div className="val">{status?.offerCount ?? 0}</div>
            <div className="lbl">Offers</div>
          </div>
        </div>

        {status?.phase === 'no_workers' && (
          <div className="empty-state" style={{ padding: 16 }}>
            Is radius mein koi available worker nahi. Retry karein ya baad mein try karein.
          </div>
        )}

        {error && <p style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</p>}

        <div className="sticky-actions" style={{ marginTop: 8 }}>
          {status?.offerCount ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => router.push(`/customer/offers/${requestId}`)}
            >
              Compare offers
            </button>
          ) : null}
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

      <DemoBridge
        hint="Open as Worker → turn Available ON → accept location → Send Offer on the alert."
        workerHref="/worker/home"
        customerHref={`/customer/dispatch/${requestId}`}
      />
    </div>
  )
}
