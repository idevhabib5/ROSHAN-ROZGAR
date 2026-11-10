'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, Circle } from 'lucide-react'
import { api } from '@/lib/client'

const STEPS = ['confirmed', 'in_progress', 'completed'] as const
const LABELS: Record<string, string> = {
  confirmed: 'Booking confirmed',
  in_progress: 'Work in progress',
  completed: 'Completed',
}

type Booking = {
  id: string
  status: string
  agreedAmountPkr: number
  scheduledTime: string
  customer: { displayName: string; photoUrl?: string | null }
  request: { issueDescription: string; location: string }
}

export default function WorkerBookingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const data = await api<Booking>(`/api/bookings/${id}`)
    setBooking(data)
  }

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [id])

  const advance = async () => {
    if (!booking) return
    const idx = STEPS.indexOf(booking.status as (typeof STEPS)[number])
    const next = STEPS[idx + 1]
    if (!next) return
    setLoading(true)
    setError(null)
    try {
      const updated = await api<Booking>(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      })
      setBooking(updated)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!booking) {
    return (
      <div className="screen narrow">
        <div className="loading-state">{error || 'Loading booking…'}</div>
      </div>
    )
  }

  const currentIdx = Math.max(0, STEPS.indexOf(booking.status as (typeof STEPS)[number]))

  return (
    <div className="screen narrow">
      <div className="page-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => router.push('/worker/home')}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="kicker" style={{ marginBottom: 2 }}>
            Active booking
          </p>
          <h2 style={{ margin: 0 }}>Job progress</h2>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              booking.customer.photoUrl ||
              'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face'
            }
            alt=""
            style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
          />
          <div style={{ flex: 1 }}>
            <strong>{booking.customer.displayName}</strong>
            <div className="muted" style={{ fontSize: 12 }}>
              {booking.request.location}
            </div>
          </div>
          <span className="badge badge-busy">Engaged</span>
        </div>
        <p style={{ margin: '0 0 8px', fontSize: 14 }}>{booking.request.issueDescription}</p>
        <div className="muted" style={{ fontSize: 12 }}>
          {booking.scheduledTime} · Rs. {booking.agreedAmountPkr} · cash on completion
        </div>
      </div>

      <div className="card-green" style={{ marginBottom: 16, fontSize: 14 }}>
        <strong>You&apos;re engaged for this slot</strong>
        <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
          You cannot take overlapping bookings while this job is active.
        </p>
      </div>

      <h3 className="section-title" style={{ fontSize: 17, marginBottom: 12 }}>
        Job timeline
      </h3>
      <div className="content-card" style={{ marginBottom: 16 }}>
        {STEPS.map((step, i) => {
          const done = i < currentIdx || booking.status === 'completed'
          const current = i === currentIdx && booking.status !== 'completed'
          return (
            <div key={step} style={{ display: 'flex', gap: 12, minHeight: 56 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    border: `2px solid ${done || current ? 'var(--primary)' : 'var(--border)'}`,
                    background: done || current ? 'var(--primary)' : 'transparent',
                    color: done || current ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {done || current ? <Check size={12} /> : <Circle size={10} />}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      margin: '4px 0',
                      background: done ? 'var(--primary)' : 'var(--border)',
                    }}
                  />
                )}
              </div>
              <div style={{ paddingBottom: 16 }}>
                <strong style={{ fontSize: 14, display: 'block' }}>{LABELS[step]}</strong>
                {current && (
                  <span className="muted" style={{ fontSize: 12 }}>
                    Current status
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <p style={{ fontSize: 12, color: 'var(--danger)', margin: '0 0 10px' }}>{error}</p>
      )}

      {booking.status !== 'completed' ? (
        <button type="button" className="btn btn-primary btn-block" disabled={loading} onClick={advance}>
          {booking.status === 'confirmed' ? 'Kaam shuru karein' : 'Job mukammal karein'}
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => router.push('/worker/home')}
        >
          Back to home
        </button>
      )}
    </div>
  )
}
