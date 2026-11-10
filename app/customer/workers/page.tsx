'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Star } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { DemoBridge } from '@/components/DemoBridge'
import { useSession } from '@/components/SessionProvider'
import { api } from '@/lib/client'
import { AREAS } from '@/lib/geo'

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
}

const FILTERS = ['Nearest', 'Available Now', 'Highest Rated'] as const

export default function NearbyWorkersPage() {
  const router = useRouter()
  const { session, patch } = useSession()
  const [workers, setWorkers] = useState<WorkerCard[]>([])
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Available Now')
  const [error, setError] = useState<string | null>(null)
  const [trade, setTrade] = useState('Plumber')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      let t = 'Plumber'
      let lat = AREAS['G-11'].latitude
      let lng = AREAS['G-11'].longitude
      if (session.requestId) {
        const req = await api<{ trade: string; latitude: number; longitude: number }>(
          `/api/service-requests/${session.requestId}`,
        )
        t = req.trade
        lat = req.latitude
        lng = req.longitude
        setTrade(t)
      }
      const data = await api<{ workers: WorkerCard[] }>(
        `/api/workers?trade=${encodeURIComponent(t)}&lat=${lat}&lng=${lng}&radiusKm=8`,
      )
      setWorkers(data.workers)
    }
    run()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [session.requestId])

  const sorted = [...workers].sort((a, b) => {
    if (filter === 'Nearest') return a.distanceKm - b.distanceKm
    if (filter === 'Highest Rated') return (b.rating ?? 0) - (a.rating ?? 0)
    return Number(b.bookable) - Number(a.bookable)
  })

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
          <h2>Find a helping hand</h2>
        </div>
        <p className="section-sub">
          {trade} · only bookable workers (server-computed availability)
        </p>

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
          <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 8 }}>{error}</p>
        )}
        {!loading && !error && sorted.length === 0 && (
          <div className="empty-state">
            Is radius mein koi bookable worker nahi. Radius expand karke dubara try karein, ya
            worker availability ON karein.
          </div>
        )}

        <div className="workers-grid">
          {sorted.map((w) => (
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
                src={
                  w.photoUrl ||
                  'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=200&h=200&fit=crop&crop=face'
                }
                alt=""
                className="avatar"
                style={{ width: 56, height: 56 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{w.displayName}</strong>
                  <span className="badge badge-success">Available</span>
                </div>
                <div className="muted">{w.trade}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <span className="chip" style={{ padding: '4px 8px' }}>
                    <MapPin size={12} /> {w.distanceKm} km
                  </span>
                  <span className="chip" style={{ padding: '4px 8px' }}>
                    <Star size={12} fill="#F5B942" color="#F5B942" /> {w.rating ?? '—'} ·{' '}
                    {w.reviewCount}
                  </span>
                </div>
                <div style={{ marginTop: 12 }}>
                  <span className="btn btn-primary btn-sm" style={{ pointerEvents: 'none' }}>
                    Book Now · from Rs. {w.visitChargePkr}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <DemoBridge
          hint="List empty ho to Worker mode mein availability ON karein, phir yahan refresh."
          workerHref="/worker/home"
          customerHref="/customer/workers"
        />
      </div>
      <BottomNav role="customer" />
    </>
  )
}
