'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Banknote, Calendar, Check, Clock, MapPin, User, Wrench } from 'lucide-react'
import { useSession } from '@/components/SessionProvider'
import { api } from '@/lib/client'

function BookingInner() {
  const router = useRouter()
  const search = useSearchParams()
  const { session, patch } = useSession()
  const bookingIdParam = search.get('bookingId') || session.bookingId
  const [summary, setSummary] = useState<{
    workerName: string
    trade: string
    location: string
    time: string
    amount: number
    quoteId: string
  } | null>(null)
  const [confirmed, setConfirmed] = useState<{ id: string; reference: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const run = async () => {
      if (bookingIdParam) {
        const booking = await api<{
          id: string
          agreedAmountPkr: number
          scheduledTime: string
          worker: { displayName: string }
          request: { trade: string; location: string }
          acceptedQuoteId: string
        }>(`/api/bookings/${bookingIdParam}`)
        setConfirmed({
          id: booking.id,
          reference: `RR-${booking.id.slice(-6).toUpperCase()}`,
        })
        setSummary({
          workerName: booking.worker.displayName,
          trade: booking.request.trade,
          location: booking.request.location,
          time: booking.scheduledTime,
          amount: booking.agreedAmountPkr,
          quoteId: booking.acceptedQuoteId,
        })
        patch({ bookingId: booking.id })
        return
      }

      if (!session.requestId || !session.selectedWorkerId) {
        router.replace('/customer/home')
        return
      }
      const req = await api<{
        trade: string
        location: string
        preferredTime: string
        quotes: { id: string; amountPkr: number; state: string; workerId: string }[]
      }>(`/api/service-requests/${session.requestId}`)
      const quote =
        req.quotes.find((q) => q.workerId === session.selectedWorkerId && q.state === 'accepted') ||
        req.quotes.find((q) => q.workerId === session.selectedWorkerId)
      if (!quote || quote.state !== 'accepted') {
        setError('Pehle offer qabool / accept karein')
        return
      }
      const worker = await api<{ displayName: string }>(`/api/workers/${session.selectedWorkerId}`)
      setSummary({
        workerName: worker.displayName,
        trade: req.trade,
        location: req.location,
        time: req.preferredTime,
        amount: quote.amountPkr,
        quoteId: quote.id,
      })
      patch({ quoteId: quote.id })
    }
    run().catch((e) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.requestId, session.selectedWorkerId, bookingIdParam])

  const confirm = async () => {
    if (!summary || !session.requestId || !session.selectedWorkerId) return
    setLoading(true)
    setError(null)
    try {
      const booking = await api<{ id: string }>('/api/bookings/confirm', {
        method: 'POST',
        body: JSON.stringify({
          requestId: session.requestId,
          workerId: session.selectedWorkerId,
          customerId: session.customerId,
          quoteId: summary.quoteId,
          scheduledTime: summary.time,
        }),
      })
      patch({ bookingId: booking.id })
      setConfirmed({ id: booking.id, reference: `RR-${booking.id.slice(-6).toUpperCase()}` })
    } catch (e) {
      const err = e as Error & { code?: string }
      setError(
        err.code === 'WORKER_ENGAGED'
          ? 'Worker is already booked.'
          : err.message,
      )
    } finally {
      setLoading(false)
    }
  }

  if (confirmed) {
    return (
      <div className="screen narrow">
        <div className="success-hero">
          <div className="icon-ring">
            <Check size={40} strokeWidth={2.5} />
          </div>
          <h1 className="section-title">Booking confirmed</h1>
          <p className="section-sub">
            Your booking is confirmed. Pay in cash when the work is done.
          </p>
          <div className="card" style={{ textAlign: 'left', marginBottom: 16 }}>
            <div className="muted" style={{ fontSize: 12 }}>
              Booking reference
            </div>
            <strong>{confirmed.reference}</strong>
            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              {summary?.trade} · {summary?.time} · Rs. {summary?.amount}
            </div>
          </div>
          <div className="sticky-actions" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => router.push(`/customer/review?bookingId=${confirmed.id}`)}
            >
              Leave a review
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => router.push(`/worker/bookings/${confirmed.id}`)}
            >
              Worker: mark complete
            </button>
          </div>
        </div>
      </div>
    )
  }

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
        <h2>Confirm booking</h2>
      </div>

      <div className="content-card stack">
        <div style={{ textAlign: 'center' }}>
          <span className="badge badge-success">
            <Check size={12} /> Ready to confirm
          </span>
        </div>

        {summary && (
          <div className="card">
            {[
              { icon: User, label: 'Worker', value: summary.workerName },
              { icon: Wrench, label: 'Service', value: summary.trade },
              { icon: MapPin, label: 'Location', value: summary.location },
              { icon: Calendar, label: 'Schedule', value: summary.time },
              { icon: Clock, label: 'Status', value: 'Pending confirmation' },
              { icon: Banknote, label: 'Agreed price', value: `Rs. ${summary.amount}` },
            ].map(({ icon: Icon, label, value }) => (
              <div className="field-row" key={label}>
                <div className="field-icon">
                  <Icon size={18} />
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {label}
                  </div>
                  <strong>{value}</strong>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="price-callout">
          <span className="muted">You pay in cash when work is done</span>
          <span className="amount">Rs. {summary?.amount ?? '—'}</span>
        </div>

        {error && <p className="status-note error">{error}</p>}

        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!summary || loading}
          onClick={confirm}
        >
          {loading ? 'Confirming…' : "Confirm booking"}
        </button>
      </div>
    </div>
  )
}

export default function BookingConfirmPage() {
  return (
    <Suspense fallback={<div className="screen narrow"><div className="loading-state">Loading…</div></div>}>
      <BookingInner />
    </Suspense>
  )
}
