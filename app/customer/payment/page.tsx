'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Banknote, CreditCard, MapPin, User, Wrench } from 'lucide-react'
import { CustomerFlowSteps } from '@/components/FlowSteps'
import { useSession } from '@/components/SessionProvider'
import { api } from '@/lib/client'
import { friendlyError } from '@/lib/ui/errors'

type BookingSummary = {
  id: string
  agreedAmountPkr: number
  scheduledTime: string
  paymentStatus: string
  worker: { displayName: string }
  request: { trade: string; location: string; issueDescription: string }
}

function PaymentInner() {
  const router = useRouter()
  const search = useSearchParams()
  const { session, patch } = useSession()
  const bookingId = search.get('bookingId') || session.bookingId
  const canceled = search.get('canceled') === '1'
  const [booking, setBooking] = useState<BookingSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!bookingId) {
      router.replace('/customer/booking')
      return
    }
    api<BookingSummary>(`/api/bookings/${bookingId}`)
      .then((b) => {
        setBooking(b)
        patch({ bookingId: b.id })
        if (b.paymentStatus === 'paid') {
          router.replace(`/customer/payment/confirmation?bookingId=${b.id}`)
        }
      })
      .catch((e) => setError(friendlyError(e, 'Could not load booking for payment.')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])

  const payOnline = async () => {
    if (!booking) return
    setLoading(true)
    setError(null)
    try {
      const res = await api<{ url: string | null }>('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({ bookingId: booking.id }),
      })
      if (!res.url) throw new Error('Stripe did not return a checkout URL')
      window.location.href = res.url
    } catch (e) {
      const err = e as Error & { code?: string }
      setError(
        err.code === 'STRIPE_NOT_CONFIGURED'
          ? 'Online payment is almost ready — add your Stripe Secret key (sk_…) to .env.'
          : friendlyError(e, 'Could not start Stripe Checkout. Try again.'),
      )
      setLoading(false)
    }
  }

  const payCash = async () => {
    if (!booking) return
    setLoading(true)
    setError(null)
    try {
      await api('/api/payments/cash', {
        method: 'POST',
        body: JSON.stringify({ bookingId: booking.id }),
      })
      router.push(`/customer/payment/confirmation?bookingId=${booking.id}&method=cash`)
    } catch (e) {
      setError(friendlyError(e, 'Could not save cash payment choice.'))
      setLoading(false)
    }
  }

  return (
    <div className="screen narrow">
      <div className="page-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => router.push(bookingId ? `/customer/booking?bookingId=${bookingId}` : '/customer/home')}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="page-title">Payment</h2>
      </div>

      <CustomerFlowSteps current="booking" />

      <div className="content-card stack">
        <div style={{ textAlign: 'center' }}>
          <span className="badge badge-success">Secure card payment</span>
          <h1 className="section-title" style={{ marginTop: 12 }}>
            Pay for your booking
          </h1>
          <p className="section-sub" style={{ margin: '0 auto' }}>
            You will confirm payment on a separate receipt page after Stripe Checkout.
          </p>
        </div>

        {canceled && (
          <p className="status-note error" role="status">
            Payment canceled. You can try again or choose cash on completion.
          </p>
        )}

        {booking && (
          <div className="card">
            {[
              { icon: User, label: 'Worker', value: booking.worker.displayName },
              { icon: Wrench, label: 'Service', value: booking.request.trade },
              { icon: MapPin, label: 'Location', value: booking.request.location },
              {
                icon: Banknote,
                label: 'Amount due',
                value: `Rs. ${booking.agreedAmountPkr}`,
              },
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
          <span className="muted">Pay now with Stripe</span>
          <span className="amount">Rs. {booking?.agreedAmountPkr ?? '—'}</span>
        </div>

        {error && (
          <p className="status-note error" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!booking || loading}
          onClick={() => void payOnline()}
        >
          <CreditCard size={18} style={{ marginRight: 8 }} />
          {loading ? 'Opening Stripe…' : 'Pay with card'}
        </button>

        <button
          type="button"
          className="btn btn-outline btn-block"
          disabled={!booking || loading}
          onClick={() => void payCash()}
        >
          Pay cash on completion
        </button>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="screen narrow">
          <div className="loading-state">Loading payment…</div>
        </div>
      }
    >
      <PaymentInner />
    </Suspense>
  )
}
