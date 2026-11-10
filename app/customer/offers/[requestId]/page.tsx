'use client'

import { useCallback, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BadgeCheck, Clock, MapPin, Star } from 'lucide-react'
import { useSession } from '@/components/SessionProvider'
import { usePolling, useRealtime } from '@/hooks/useRealtime'
import { api } from '@/lib/client'

type Offer = {
  offerId: string
  amountPkr: number
  etaMinutes: number | null
  message: string | null
  state: string
  worker: {
    id: string
    displayName: string
    photoUrl: string | null
    trade: string
    experienceYears: number
    verificationStatus: string
    rating: number | null
    reviewCount: number
    distanceKm: number
    approxArea: string
  }
}

const SORTS = ['Recommended', 'Lowest Price', 'Nearest', 'Highest Rated', 'Fastest Arrival'] as const

export default function CompareOffersPage() {
  const { requestId } = useParams<{ requestId: string }>()
  const router = useRouter()
  const { patch } = useSession()
  const [offers, setOffers] = useState<Offer[]>([])
  const [sort, setSort] = useState<(typeof SORTS)[number]>('Recommended')
  const [error, setError] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const data = await api<{ offers: Offer[] }>(`/api/offers?requestId=${requestId}`)
    setOffers(data.offers)
    patch({ requestId })
  }, [requestId, patch])

  useRealtime((event) => {
    if (
      event === 'offer:received' ||
      event === 'offer:updated' ||
      event === 'offer:withdrawn' ||
      event === 'booking:confirmed'
    ) {
      load().catch((e) => setError(e.message))
    }
  })
  usePolling(() => load().catch((e) => setError(e.message)), 2500, true)

  const sorted = useMemo(() => {
    const list = [...offers]
    switch (sort) {
      case 'Lowest Price':
        return list.sort((a, b) => a.amountPkr - b.amountPkr)
      case 'Nearest':
        return list.sort((a, b) => a.worker.distanceKm - b.worker.distanceKm)
      case 'Highest Rated':
        return list.sort((a, b) => (b.worker.rating ?? 0) - (a.worker.rating ?? 0))
      case 'Fastest Arrival':
        return list.sort((a, b) => (a.etaMinutes ?? 999) - (b.etaMinutes ?? 999))
      default:
        return list.sort((a, b) => {
          const score = (o: Offer) =>
            (o.worker.rating ?? 3) * 2 -
            o.worker.distanceKm * 0.3 -
            o.amountPkr / 2000 -
            (o.etaMinutes ?? 40) / 60
          return score(b) - score(a)
        })
    }
  }, [offers, sort])

  const accept = async (offerId: string, workerId: string) => {
    setLoadingId(offerId)
    setError(null)
    try {
      const booking = await api<{ id: string }>(`/api/offers/${offerId}/accept`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      patch({
        bookingId: booking.id,
        selectedWorkerId: workerId,
        quoteId: offerId,
        requestId,
      })
      router.push(`/customer/booking?bookingId=${booking.id}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="screen narrow">
      <div className="page-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => router.push(`/customer/dispatch/${requestId}`)}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="page-title">Compare offers</h2>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {SORTS.map((s) => (
          <button
            key={s}
            type="button"
            className={`chip${sort === s ? ' active' : ''}`}
            onClick={() => setSort(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="empty-state">No offers yet. Waiting for workers.</div>
      )}

      <div className="stack">
        {sorted.map((o) => (
          <div key={o.offerId} className="content-card">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  o.worker.photoUrl ||
                  'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=200&h=200&fit=crop&crop=face'
                }
                alt=""
                className="avatar"
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <strong>{o.worker.displayName}</strong>
                  {o.worker.verificationStatus === 'verified' && (
                    <span className="badge badge-success">
                      <BadgeCheck size={12} /> Verified
                    </span>
                  )}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {o.worker.trade} · {o.worker.experienceYears} yrs
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ color: 'var(--primary)' }}>Rs. {o.amountPkr}</strong>
                <div className="muted" style={{ fontSize: 12 }}>
                  {o.etaMinutes ?? '—'} min
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <span className="chip" style={{ padding: '4px 8px' }}>
                <MapPin size={12} /> ~{o.worker.distanceKm} km · {o.worker.approxArea}
              </span>
              <span className="chip" style={{ padding: '4px 8px' }}>
                <Star size={12} fill="#FFC928" color="#FFC928" /> {o.worker.rating ?? '—'} (
                {o.worker.reviewCount})
              </span>
              <span className="chip" style={{ padding: '4px 8px' }}>
                <Clock size={12} /> ETA {o.etaMinutes ?? '—'}m
              </span>
            </div>

            {o.message && (
              <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
                “{o.message}”
              </p>
            )}

            <div className="sticky-actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={loadingId === o.offerId}
                onClick={() => accept(o.offerId, o.worker.id)}
              >
                {loadingId === o.offerId ? 'Accepting…' : 'Accept offer'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  patch({ selectedWorkerId: o.worker.id })
                  router.push(`/customer/workers/${o.worker.id}`)
                }}
              >
                View profile
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="status-note error" style={{ marginTop: 12 }}>{error}</p>}
    </div>
  )
}
