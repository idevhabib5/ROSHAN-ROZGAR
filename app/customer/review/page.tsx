'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, Mic } from 'lucide-react'
import { Stars } from '@/components/Stars'
import { DemoBridge } from '@/components/DemoBridge'
import { useSession } from '@/components/SessionProvider'
import { api } from '@/lib/client'

function ReviewInner() {
  const router = useRouter()
  const search = useSearchParams()
  const { session } = useSession()
  const bookingId = search.get('bookingId') || session.bookingId
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('Bohot acha kaam. Leak jaldi theek ho gaya.')
  const [booking, setBooking] = useState<{
    id: string
    status: string
    worker: { displayName: string; photoUrl?: string | null; id?: string }
    request: { issueDescription: string; location: string }
    review?: { id: string } | null
  } | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!bookingId) {
      setError('Booking id missing')
      return
    }
    api<NonNullable<typeof booking>>(`/api/bookings/${bookingId}`)
      .then((b) => {
        setBooking(b)
        if (b.review) setSubmitted(true)
      })
      .catch((e) => setError(e.message))
  }, [bookingId])

  const submit = async () => {
    if (!bookingId) return
    setLoading(true)
    setError(null)
    try {
      if (booking?.status !== 'completed') {
        await api(`/api/bookings/${bookingId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'in_progress' }),
        }).catch(() => undefined)
        await api(`/api/bookings/${bookingId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'completed' }),
        })
      }
      await api('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          bookingId,
          customerId: session.customerId,
          rating,
          comment,
        }),
      })
      setSubmitted(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="screen narrow">
        <div className="success-hero">
          <div className="icon-ring">
            <Check size={40} strokeWidth={2.5} />
          </div>
          <h1 className="section-title">Job well done — shukriya!</h1>
          <p className="section-sub">
            Aapka review worker ki public reputation mein add ho gaya.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => router.push('/')}>
            Back to start
          </button>
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
          onClick={() => router.push('/customer/booking')}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h2>How did it go?</h2>
      </div>

      <div className="content-card stack" style={{ textAlign: 'center' }}>
        <div className="success-hero" style={{ padding: 16 }}>
          <div className="icon-ring" style={{ width: 64, height: 64 }}>
            <Check size={28} />
          </div>
          <h1 className="section-title" style={{ fontSize: 22 }}>
            Kaam mukammal? Apna tajurba batayein.
          </h1>
        </div>

        {booking && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                booking.worker.photoUrl ||
                'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=200&h=200&fit=crop&crop=face'
              }
              alt=""
              className="avatar"
              style={{ margin: '0 auto' }}
            />
            <strong>{booking.worker.displayName}</strong>
            <div className="muted">
              {booking.request.issueDescription} · {booking.request.location}
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Stars value={rating} size onChange={setRating} />
        </div>

        <textarea
          className="textarea"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional short feedback…"
        />

        <button type="button" className="card-soft" style={{ display: 'flex', gap: 12, textAlign: 'left' }}>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--primary)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Mic size={16} />
          </span>
          <div>
            <strong style={{ fontSize: 14 }}>Voice review (optional)</strong>
            <div className="muted" style={{ fontSize: 12 }}>
              Demo uses text review as primary
            </div>
          </div>
        </button>

        {error && <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{error}</p>}
        {booking && booking.status !== 'completed' && (
          <p className="muted" style={{ fontSize: 12 }}>
            Agar worker ne complete nahi kiya, submit pe status complete karke review save hoga
            (demo helper).
          </p>
        )}

        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={loading || !bookingId}
          onClick={submit}
        >
          {loading ? 'Submitting…' : 'Submit review'}
        </button>
      </div>

      {bookingId && (
        <DemoBridge
          hint="Prefer realistic flow: worker marks complete first, then submit review."
          workerHref={`/worker/bookings/${bookingId}`}
          customerHref={`/customer/review?bookingId=${bookingId}`}
        />
      )}
    </div>
  )
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="screen">
          <div className="loading-state">Loading…</div>
        </div>
      }
    >
      <ReviewInner />
    </Suspense>
  )
}
