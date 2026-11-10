'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, CreditCard, Banknote } from 'lucide-react'
import { CustomerFlowSteps } from '@/components/FlowSteps'
import { useSession } from '@/components/SessionProvider'
import { api } from '@/lib/client'
import { friendlyError } from '@/lib/ui/errors'

type ConfirmResult = {
  paid: boolean
  reference: string
  amountPkr: number
  booking: {
    id: string
    paymentStatus: string
    paymentMethod: string | null
    scheduledTime: string
    worker: { displayName: string }
    request: { trade: string; location: string }
  }
}

function ConfirmationInner() {
  const router = useRouter()
  const search = useSearchParams()
  const { patch } = useSession()
  const sessionId = search.get('session_id')
  const bookingIdParam = search.get('bookingId')
  const method = search.get('method')
  const [result, setResult] = useState<ConfirmResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        if (sessionId) {
          const data = await api<ConfirmResult>('/api/payments/confirm', {
            method: 'POST',
            body: JSON.stringify({ sessionId }),
          })
          setResult(data)
          patch({ bookingId: data.booking.id })
          return
        }

        if (bookingIdParam) {
          const booking = await api<ConfirmResult['booking'] & { agreedAmountPkr: number }>(
            `/api/bookings/${bookingIdParam}`,
          )
          setResult({
            paid: booking.paymentStatus === 'paid',
            reference: `RR-${booking.id.slice(-6).toUpperCase()}`,
            amountPkr: booking.agreedAmountPkr,
            booking,
          })
          patch({ bookingId: booking.id })
          return
        }

        setError('Missing payment session. Go back to your booking.')
      } catch (e) {
        setError(friendlyError(e, 'Could not confirm payment status.'))
      } finally {
        setLoading(false)
      }
    }
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, bookingIdParam])

  if (loading) {
    return (
      <div className="screen narrow">
        <div className="loading-state">Confirming payment…</div>
      </div>
    )
  }

  const cashChosen = method === 'cash' || result?.booking.paymentStatus === 'cash'
  const success = Boolean(result && (result.paid || cashChosen))

  return (
    <div className="screen narrow">
      <CustomerFlowSteps current="booking" />
      <div className="success-hero">
        <div className="icon-ring">
          <Check size={40} strokeWidth={2.5} />
        </div>
        <h1 className="section-title">
          {success
            ? cashChosen
              ? 'Cash payment selected'
              : 'Payment confirmed'
            : 'Payment pending'}
        </h1>
        <p className="section-sub">
          {success
            ? cashChosen
              ? 'Pay the worker in cash when the job is finished.'
              : 'Stripe payment received. Your booking is paid and confirmed.'
            : 'We could not verify a successful Stripe charge yet.'}
        </p>

        {error && (
          <p className="status-note error" role="alert">
            {error}
          </p>
        )}

        {result && (
          <div className="card" style={{ textAlign: 'left', marginBottom: 16 }}>
            <div className="muted" style={{ fontSize: 12 }}>
              Payment reference
            </div>
            <strong>{result.reference}</strong>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 12,
                fontSize: 14,
              }}
            >
              {cashChosen ? <Banknote size={16} /> : <CreditCard size={16} />}
              <span>
                {cashChosen ? 'Cash on completion' : 'Paid online with Stripe'} · Rs.{' '}
                {result.amountPkr}
              </span>
            </div>
            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              {result.booking.request.trade} · {result.booking.worker.displayName} ·{' '}
              {result.booking.request.location}
            </div>
            <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
              Schedule: {result.booking.scheduledTime}
            </div>
          </div>
        )}

        <div className="sticky-actions" style={{ marginTop: 0 }}>
          {result && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => router.push(`/customer/review?bookingId=${result.booking.id}`)}
            >
              Continue to review
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => router.push('/customer/home')}
          >
            Back to home
          </button>
          {!success && result && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => router.push(`/customer/payment?bookingId=${result.booking.id}`)}
            >
              Try payment again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PaymentConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="screen narrow">
          <div className="loading-state">Loading confirmation…</div>
        </div>
      }
    >
      <ConfirmationInner />
    </Suspense>
  )
}
