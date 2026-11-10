'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { Stars } from '@/components/Stars'
import { useSession } from '@/components/SessionProvider'
import { api } from '@/lib/client'
import { friendlyError } from '@/lib/ui/errors'

function ReviewInner() {
  const router = useRouter()
  const search = useSearchParams()
  const { session } = useSession()
  const bookingId = search.get('bookingId') || session.bookingId
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
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
      .catch((e) => setError(friendlyError(e)))
  }, [bookingId])

  const completed = booking?.status === 'completed'
  const canReview = Boolean(bookingId && completed && !booking?.review)

  const submit = async () => {
    if (!bookingId || !canReview) return
    setLoading(true)
    setError(null)
    try {
      await api('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          bookingId,
          customerId: session.customerId,
          rating,
          comment: comment.trim() || null,
        }),
      })
      setSubmitted(true)
    } catch (e) {
      setError(friendlyError(e, 'Could not save your review. Try again.'))
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
          <h1 className="section-title">Thanks for your review</h1>
          <p className="section-sub">Your feedback was added to the worker&apos;s public rating.</p>
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
          onClick={() => router.push(bookingId ? `/customer/booking?bookingId=${bookingId}` : '/customer/home')}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="page-title">Leave a review</h2>
      </div>

      <div className="content-card stack" style={{ textAlign: 'center' }}>
        <h1 className="section-title" style={{ fontSize: 22 }}>
          How was the work?
        </h1>

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
            <div className="muted truncate-2">
              {booking.request.issueDescription} · {booking.request.location}
            </div>
            <span className={`badge ${completed ? 'badge-success' : 'badge-warning'}`}>
              {completed ? 'Job completed' : `Status: ${booking.status}`}
            </span>
          </>
        )}

        {!completed && booking && (
          <div className="status-note" role="status">
            Reviews unlock after the worker marks the job complete. Ask them to open the booking and
            mark it completed, then return here.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Stars value={rating} size onChange={canReview ? setRating : undefined} />
        </div>

        <div>
          <label className="form-label" htmlFor="review-comment">
            Comment <span className="opt">optional</span>
          </label>
          <textarea
            id="review-comment"
            className="textarea"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Short feedback…"
            disabled={!canReview}
          />
        </div>

        {error && (
          <p className="status-note error" role="alert">
            {error}
          </p>
        )}

        <div className="sticky-actions" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={loading || !canReview}
            onClick={submit}
            aria-label={
              !canReview ? 'Submit review — available only after job completion' : 'Submit review'
            }
          >
            {loading ? 'Submitting…' : 'Submit review'}
          </button>
          {bookingId && !completed && (
            <button
              type="button"
              className="btn btn-outline btn-block"
              onClick={() => router.push(`/worker/bookings/${bookingId}`)}
            >
              Open worker completion screen
            </button>
          )}
        </div>
      </div>
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
