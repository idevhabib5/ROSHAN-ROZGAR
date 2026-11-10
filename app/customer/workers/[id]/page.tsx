'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, MessageCircle, Star } from 'lucide-react'
import { Stars } from '@/components/Stars'
import { BottomNav } from '@/components/BottomNav'
import { useSession } from '@/components/SessionProvider'
import { api } from '@/lib/client'

type WorkerDetail = {
  id: string
  displayName: string
  trade: string
  experienceYears: number
  serviceArea: string
  visitChargePkr: number
  photoUrl?: string | null
  distanceKm: number
  bookable: boolean
  rating: number | null
  reviewCount: number
  completedJobs: number
  reviews: {
    id: string
    rating: number
    comment: string | null
    isDemoSeed: boolean
    customerName: string
  }[]
}

export default function WorkerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { patch, session } = useSession()
  const [worker, setWorker] = useState<WorkerDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<WorkerDetail>(`/api/workers/${id}`)
      .then(setWorker)
      .catch((e) => setError(e.message))
  }, [id])

  if (error) {
    return (
      <div className="screen">
        <div className="empty-state">{error}</div>
      </div>
    )
  }

  if (!worker) {
    return (
      <div className="screen">
        <div className="loading-state">Loading profile…</div>
      </div>
    )
  }

  return (
    <>
      <div className="screen with-nav">
        <div className="page-header">
          <button
            type="button"
            className="back-btn"
            onClick={() => router.push('/customer/workers')}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h2>Worker profile</h2>
        </div>

        <div className="panel-grid">
          <div className="content-card" style={{ textAlign: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                worker.photoUrl ||
                'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=200&h=200&fit=crop&crop=face'
              }
              alt=""
              className="avatar avatar-lg"
              style={{ margin: '0 auto 14px' }}
            />
            <h1 className="section-title" style={{ marginBottom: 4 }}>
              {worker.displayName}
            </h1>
            <p className="muted">{worker.trade}</p>
            <div
              style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}
            >
              <span className={`badge ${worker.bookable ? 'badge-success' : 'badge-busy'}`}>
                {worker.bookable ? 'Available now' : 'Unavailable'}
              </span>
              <span className="chip" style={{ padding: '4px 8px' }}>
                <MapPin size={12} /> {worker.distanceKm} km
              </span>
            </div>
            <div className="stat-grid" style={{ marginTop: 18, textAlign: 'left' }}>
              <div className="stat-card">
                <div className="val" style={{ fontSize: 18 }}>
                  {worker.experienceYears} yrs
                </div>
                <div className="lbl">Self-reported</div>
              </div>
              <div className="stat-card">
                <div className="val" style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {worker.rating ?? '—'} <Star size={16} fill="#F5B942" color="#F5B942" />
                </div>
                <div className="lbl">{worker.reviewCount} reviews</div>
              </div>
              <div className="stat-card">
                <div className="val" style={{ fontSize: 18 }}>
                  {worker.completedJobs}
                </div>
                <div className="lbl">Completed jobs</div>
              </div>
              <div className="stat-card">
                <div className="val" style={{ fontSize: 18 }}>
                  Rs. {worker.visitChargePkr}
                </div>
                <div className="lbl">Indicative charge</div>
              </div>
            </div>
            <p className="muted" style={{ marginTop: 14, marginBottom: 0, fontSize: 12 }}>
              Trust = job history + reviews. No CNIC/government verification badge.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-block"
              style={{ marginTop: 18 }}
              disabled={!worker.bookable || !session.requestId}
              onClick={() => {
                patch({ selectedWorkerId: worker.id })
                router.push('/customer/chat')
              }}
            >
              <MessageCircle size={16} /> Let&apos;s talk it through
            </button>
            {!session.requestId && (
              <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                Pehle home se service request banayein.
              </p>
            )}
          </div>

          <div className="stack">
            <h3 className="section-title" style={{ fontSize: 20 }}>
              What people say
            </h3>
            {worker.reviews.length === 0 && (
              <div className="empty-state">Abhi reviews nahi — pehla booking ke baad aayenge.</div>
            )}
            {worker.reviews.map((r) => (
              <div className="card" key={r.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: 14 }}>{r.customerName}</strong>
                  {r.isDemoSeed && <span className="muted" style={{ fontSize: 10 }}>demo seed</span>}
                </div>
                <Stars value={r.rating} />
                <p className="muted" style={{ marginTop: 8, marginBottom: 0, color: 'var(--text)' }}>
                  {r.comment}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav role="customer" />
    </>
  )
}
