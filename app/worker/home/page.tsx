'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Briefcase, Clock, MapPin, Star } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { JobAlertModal, type JobAlertPayload } from '@/components/JobAlertModal'
import { useSession } from '@/components/SessionProvider'
import { useGeolocation } from '@/hooks/useGeolocation'
import { usePolling, useRealtime } from '@/hooks/useRealtime'
import { api } from '@/lib/client'
import { DEMO_IDS } from '@/lib/session'

type Worker = {
  id: string
  displayName: string
  photoUrl?: string | null
  onlinePreference: boolean
  bookable?: boolean
  engaged?: boolean
  rating?: number | null
  reviewCount?: number
  completedJobs?: number
  lastLocationAt?: string | null
}

type Opportunity = {
  notificationId: string
  jobId: string
  jobTitle: string
  serviceCategory: string
  shortDescription: string
  approximateArea: string
  approximateDistanceKm: number
  customerBudget: number | null
  preferredTime: string
  urgency: string
}

export default function WorkerHomePage() {
  const router = useRouter()
  const { session, ready, setWorkerId, patch } = useSession()
  const [worker, setWorker] = useState<Worker | null>(null)
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [activeBooking, setActiveBooking] = useState<{ id: string; status: string } | null>(null)
  const [alert, setAlert] = useState<JobAlertPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  const geo = useGeolocation({
    workerId: session.workerId,
    enabled: Boolean(worker?.onlinePreference),
  })

  const load = useCallback(async () => {
    try {
      const w = await api<Worker>(`/api/workers/${session.workerId}`)
      setWorker(w)
      const inbox = await api<{ opportunities: Opportunity[] }>('/api/workers/me/opportunities')
      setOpps(inbox.opportunities)
      const bookings = await api<{ bookings: { id: string; status: string }[] }>(
        `/api/bookings?workerId=${session.workerId}`,
      )
      setActiveBooking(
        bookings.bookings.find((b) => b.status === 'confirmed' || b.status === 'in_progress') ||
          null,
      )
    } catch (e) {
      setError((e as Error).message)
    }
  }, [session.workerId])

  useEffect(() => {
    if (ready) {
      patch({ role: 'worker' })
      load()
    }
  }, [ready, load, patch])

  useRealtime((event, payload) => {
    if (event === 'job:new_request') {
      const p = payload as JobAlertPayload
      setAlert(p)
      load().catch(() => undefined)
    }
    if (event === 'offer:accepted' || event === 'offer:not_selected' || event === 'booking:confirmed') {
      load().catch(() => undefined)
    }
  })

  usePolling(() => load().catch(() => undefined), 4000, true)

  const toggle = async () => {
    if (!worker) return
    const updated = await api<Worker>(`/api/workers/${worker.id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ onlinePreference: !worker.onlinePreference }),
    })
    setWorker({ ...worker, ...updated })
    if (updated.onlinePreference) geo.requestAndWatch()
  }

  const freshness =
    worker?.lastLocationAt || geo.lastSentAt
      ? `Location fresh · ${new Date(worker?.lastLocationAt || geo.lastSentAt!).toLocaleTimeString()}`
      : 'No recent location. Enable GPS while available.'

  return (
    <>
      <div className="screen with-nav">
        <div className="panel-grid">
          <div className="stack">
            <div className="content-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  worker?.photoUrl ||
                  'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=200&h=200&fit=crop&crop=face'
                }
                alt=""
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <div className="kicker" style={{ marginBottom: 2 }}>
                  Available for jobs
                </div>
                <strong style={{ fontSize: 18 }}>{worker?.displayName || 'Worker'}</strong>
              </div>
              <button type="button" className="back-btn" aria-label="Alerts" onClick={load}>
                <Bell size={18} />
              </button>
            </div>

            <button
              type="button"
              onClick={toggle}
              className="card-green"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                textAlign: 'left',
                cursor: 'pointer',
              }}
              aria-pressed={Boolean(worker?.onlinePreference)}
              aria-label={
                worker?.onlinePreference ? 'Turn availability off' : 'Turn availability on'
              }
            >
              <div>
                <strong style={{ fontSize: 16 }}>
                  Available for jobs: {worker?.onlinePreference ? 'On' : 'Off'}
                </strong>
                <div className="muted" style={{ marginTop: 4 }}>
                  {worker?.engaged
                    ? 'Active booking. New jobs are paused.'
                    : worker?.onlinePreference
                      ? 'You will receive nearby job alerts.'
                      : 'Job alerts are paused.'}
                </div>
              </div>
              <div
                className={`toggle ${worker?.onlinePreference ? 'on' : ''}`}
                aria-hidden
              />
            </button>

            <div className="content-card" style={{ fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} color="var(--primary)" />
                <strong>Live location</strong>
              </div>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                {freshness}
              </p>
              {geo.permission === 'denied' && (
                <p style={{ color: 'var(--danger)', fontSize: 12, margin: '8px 0 0' }}>
                  Location permission denied. Enable location while available for nearby matching.
                </p>
              )}
              {geo.error && (
                <p style={{ color: 'var(--warning)', fontSize: 12, margin: '8px 0 0' }}>
                  {geo.error}
                </p>
              )}
              {worker?.onlinePreference && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: 10 }}
                  onClick={geo.requestAndWatch}
                >
                  Refresh location permission
                </button>
              )}
            </div>

            <div className="stat-grid">
              <div className="stat-card">
                <div className="val">{worker?.completedJobs ?? 0}</div>
                <div className="lbl">Completed Jobs</div>
              </div>
              <div className="stat-card">
                <div className="val" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {worker?.rating ?? '—'} <Star size={16} fill="#FFC928" color="#FFC928" />
                </div>
                <div className="lbl">{worker?.reviewCount ?? 0} reviews</div>
              </div>
            </div>
          </div>

          <div className="stack" id="opportunities">
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Nearby job opportunities</h3>
            {opps.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 16px' }}>
                No open jobs nearby. Stay available with a fresh location.
              </div>
            ) : (
              opps.map((o) => (
                <button
                  key={o.notificationId}
                  type="button"
                  className="content-card"
                  style={{ textAlign: 'left', cursor: 'pointer', borderColor: 'var(--primary)' }}
                  onClick={() => router.push(`/worker/jobs/${o.jobId}`)}
                >
                  <strong>{o.jobTitle || o.serviceCategory}</strong>
                  <div className="muted" style={{ marginTop: 4 }}>
                    {o.approximateArea} · ~{o.approximateDistanceKm} km
                    {o.customerBudget != null ? ` · Budget Rs. ${o.customerBudget}` : ''}
                    {o.preferredTime ? ` · ${o.preferredTime}` : ''}
                  </div>
                  <p className="truncate-2" style={{ margin: '8px 0 0', fontSize: 13 }}>
                    {o.shortDescription}
                  </p>
                  <span className="btn btn-primary btn-sm" style={{ marginTop: 12, pointerEvents: 'none' }}>
                    View &amp; send offer
                  </span>
                </button>
              ))
            )}

            <div className="content-card">
              <h3 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 800 }}>Current status</h3>
              <div className="field-row" style={{ paddingTop: 0 }}>
                <div className="field-icon">
                  <Briefcase size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Active booking
                  </div>
                  <strong>
                    {activeBooking ? `Status: ${activeBooking.status}` : 'No active booking'}
                  </strong>
                </div>
                <span className={`badge ${activeBooking ? 'badge-busy' : 'badge-success'}`}>
                  {activeBooking ? 'Busy' : 'Free'}
                </span>
              </div>
              <div className="field-row" style={{ paddingBottom: 0 }}>
                <div className="field-icon">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Open opportunities
                  </div>
                  <strong>{opps.length} nearby</strong>
                </div>
              </div>
            </div>

            <div className="sticky-actions" style={{ marginTop: 0 }}>
              {activeBooking && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => router.push(`/worker/bookings/${activeBooking.id}`)}
                >
                  Open active booking
                </button>
              )}
              {session.workerId !== DEMO_IDS.workerAli && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setWorkerId(DEMO_IDS.workerAli)
                    setTimeout(() => load(), 50)
                  }}
                >
                  Use demo worker (Ali Raza)
                </button>
              )}
            </div>
            {error && (
              <p className="status-note error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>

      {alert && (
        <JobAlertModal
          alert={alert}
          onClose={() => setAlert(null)}
          onView={() => {
            router.push(`/worker/jobs/${alert.jobId}`)
            setAlert(null)
          }}
          onOffer={() => {
            router.push(`/worker/jobs/${alert.jobId}`)
            setAlert(null)
          }}
          onDecline={() => setAlert(null)}
        />
      )}
      <BottomNav role="worker" />
    </>
  )
}
