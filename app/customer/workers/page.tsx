'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Star } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { useSession } from '@/components/SessionProvider'
import { api } from '@/lib/client'
import { AREAS, TRADES } from '@/lib/geo'
import { friendlyError } from '@/lib/ui/errors'

type WorkerCard = {
  id: string
  displayName: string
  trade: string
  photoUrl?: string | null
  distanceKm: number
  rating: number | null
  reviewCount: number
  bookable: boolean
  visitChargePkr: number
  verificationStatus?: string
}

const FILTERS = ['Nearest', 'Available Now', 'Highest Rated'] as const

export default function NearbyWorkersPage() {
  const router = useRouter()
  const { session, patch } = useSession()
  const [workers, setWorkers] = useState<WorkerCard[]>([])
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Available Now')
  const [error, setError] = useState<string | null>(null)
  const [trade, setTrade] = useState<(typeof TRADES)[number]>('Plumber')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let lat = AREAS['F-10'].latitude
      let lng = AREAS['F-10'].longitude
      let nextTrade = trade

      if (session.requestId) {
        const req = await api<{ trade: string; latitude: number; longitude: number }>(
          `/api/service-requests/${session.requestId}`,
        )
        if (TRADES.includes(req.trade as (typeof TRADES)[number])) {
          nextTrade = req.trade as (typeof TRADES)[number]
          setTrade(nextTrade)
        }
        lat = req.latitude
        lng = req.longitude
      }

      const data = await api<{ workers: WorkerCard[] }>(
        `/api/workers?trade=${encodeURIComponent(nextTrade)}&lat=${lat}&lng=${lng}&radiusKm=12&includeOffline=1`,
      )
      setWorkers(data.workers)
    } catch (e) {
      setError(friendlyError(e, 'Could not load workers. Try again.'))
    } finally {
      setLoading(false)
    }
  }, [session.requestId, trade])

  useEffect(() => {
    void load()
  }, [load])

  const sorted = [...workers].sort((a, b) => {
    if (filter === 'Nearest') return a.distanceKm - b.distanceKm
    if (filter === 'Highest Rated') return (b.rating ?? 0) - (a.rating ?? 0)
    return Number(b.bookable) - Number(a.bookable)
  })

  const visible =
    filter === 'Available Now' ? sorted.filter((w) => w.bookable) : sorted

  return (
    <>
      <div className="screen with-nav">
        <div className="page-header">
          <button
            type="button"
            className="back-btn"
            onClick={() => router.push('/customer/home')}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h2>Nearby workers</h2>
        </div>
        <p className="section-sub">
          Browse sample worker profiles by trade. Bookable workers can take jobs now.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {TRADES.map((t) => (
            <button
              key={t}
              type="button"
              className={`chip${trade === t ? ' active' : ''}`}
              onClick={() => setTrade(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`chip${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {loading && <div className="loading-state">Finding nearby workers…</div>}
        {error && (
          <p className="status-note error" role="alert">
            {error}{' '}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>
              Retry
            </button>
          </p>
        )}
        {!loading && !error && visible.length === 0 && (
          <div className="empty-state">
            Is trade / filter mein koi worker nahi. Doosra trade try karein.
          </div>
        )}

        <div className="workers-grid">
          {visible.map((w) => (
            <button
              key={w.id}
              type="button"
              className="worker-card"
              onClick={() => {
                patch({ selectedWorkerId: w.id })
                router.push(`/customer/workers/${w.id}`)
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={w.photoUrl || portraitFallback}
                alt=""
                className="avatar"
                style={{ width: 56, height: 56 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{w.displayName}</strong>
                  <span className={`badge ${w.bookable ? 'badge-success' : 'badge-warning'}`}>
                    {w.bookable ? 'Available' : 'Away'}
                  </span>
                </div>
                <div className="muted">{w.trade}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <span className="chip" style={{ padding: '4px 8px' }}>
                    <MapPin size={12} /> {w.distanceKm} km
                  </span>
                  <span className="chip" style={{ padding: '4px 8px' }}>
                    <Star size={12} fill="#FFC928" color="#FFC928" /> {w.rating ?? '—'} ·{' '}
                    {w.reviewCount}
                  </span>
                </div>
                <div style={{ marginTop: 12 }}>
                  <span className="btn btn-primary btn-sm" style={{ pointerEvents: 'none' }}>
                    View profile · from Rs. {w.visitChargePkr}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <BottomNav role="customer" />
    </>
  )
}

const portraitFallback = 'https://randomuser.me/api/portraits/men/1.jpg'
