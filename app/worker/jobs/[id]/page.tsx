'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Banknote, Clock, MapPin } from 'lucide-react'
import { useSession } from '@/components/SessionProvider'
import { useRealtime } from '@/hooks/useRealtime'
import { api } from '@/lib/client'
import { approxAreaLabel } from '@/lib/geo'
import { friendlyError } from '@/lib/ui/errors'

const OFFER_STATE_LABEL: Record<string, string> = {
  active: 'Pending customer reply',
  proposed: 'Pending customer reply',
  accepted: 'Accepted',
  withdrawn: 'Withdrawn',
  not_selected: 'Not selected',
  expired: 'Expired',
}

const REQUEST_STATUS_LABEL: Record<string, string> = {
  searching: 'Open for offers',
  offers_received: 'Receiving offers',
  open: 'Open for offers',
  quoted: 'Open for offers',
  assigned: 'Worker selected',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

type RequestDetail = {
  id: string
  title?: string | null
  trade: string
  issueDescription: string
  location: string
  preferredTime: string
  budgetPkr?: number | null
  urgency: string
  status: string
  customer: { id: string; displayName: string; photoUrl?: string | null }
  quotes: {
    id: string
    amountPkr: number
    etaMinutes?: number | null
    state: string
    workerId: string
  }[]
}

export default function WorkerJobPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { session } = useSession()
  const [req, setReq] = useState<RequestDetail | null>(null)
  const [amount, setAmount] = useState(1500)
  const [eta, setEta] = useState(20)
  const [message, setMessage] = useState('Main jaldi aa sakta hoon.')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusNote, setStatusNote] = useState<string | null>(null)

  const load = async () => {
    const data = await api<RequestDetail>(`/api/service-requests/${id}`)
    setReq(data)
    const mine = data.quotes.find((q) => q.workerId === session.workerId)
    if (mine) {
      setAmount(mine.amountPkr)
      if (mine.etaMinutes) setEta(mine.etaMinutes)
    } else if (data.budgetPkr) {
      setAmount(data.budgetPkr)
    }
  }

  useEffect(() => {
    load().catch((e) => setError(friendlyError(e, 'Could not load this job.')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session.workerId])

  useRealtime((event) => {
    if (event === 'offer:accepted') {
      setStatusNote('Offer accepted. Booking confirmed.')
      load().catch(() => undefined)
    }
    if (event === 'offer:not_selected') {
      setStatusNote('Another worker was selected for this job.')
      load().catch(() => undefined)
    }
    if (event === 'job:request_cancelled' || event === 'job:request_expired') {
      setStatusNote('This request is no longer open.')
      load().catch(() => undefined)
    }
  })

  const myQuote = req?.quotes.find((q) => q.workerId === session.workerId)
  const canSendOffer =
    !myQuote &&
    ['searching', 'offers_received', 'open', 'quoted'].includes(req?.status || '') &&
    amount >= 100 &&
    eta >= 5

  const sendOffer = async () => {
    if (!canSendOffer || loading) return
    setLoading(true)
    setError(null)
    try {
      await api('/api/offers', {
        method: 'POST',
        body: JSON.stringify({
          requestId: id,
          amountPkr: amount,
          etaMinutes: eta,
          message,
        }),
      })
      await load()
      setStatusNote('Offer submitted. Waiting for the customer.')
    } catch (e) {
      setError(friendlyError(e, 'Could not send your offer. Check your connection and try again.'))
    } finally {
      setLoading(false)
    }
  }

  const withdraw = async () => {
    if (!myQuote || loading) return
    setLoading(true)
    setError(null)
    try {
      await api(`/api/offers/${myQuote.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'withdraw' }),
      })
      await load()
      setStatusNote('Offer withdrawn.')
    } catch (e) {
      setError(friendlyError(e, 'Could not withdraw the offer. Try again.'))
    } finally {
      setLoading(false)
    }
  }

  if (!req) {
    return (
      <div className="screen narrow">
        <div className="loading-state">{error || 'Loading job…'}</div>
      </div>
    )
  }

  const approx = approxAreaLabel(req.location)

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
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="kicker" style={{ marginBottom: 2 }}>
            Job opportunity
          </p>
          <h2 className="page-title">{req.title || 'New job nearby'}</h2>
        </div>
      </div>

      <div className="content-card stack">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <strong>{req.trade}</strong>
          <span className="badge badge-warning">
            {REQUEST_STATUS_LABEL[req.status] || req.status}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 14 }}>{req.issueDescription}</p>

        <div className="field-row">
          <div className="field-icon">
            <MapPin size={18} />
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12 }}>
              Approximate area (precise address after booking)
            </div>
            <strong>{approx}</strong>
          </div>
        </div>
        <div className="field-row">
          <div className="field-icon">
            <Clock size={18} />
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12 }}>
              Preferred time / urgency
            </div>
            <strong>
              {req.preferredTime} · {req.urgency}
            </strong>
          </div>
        </div>
        <div className="field-row" style={{ border: 0 }}>
          <div className="field-icon">
            <Banknote size={18} />
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12 }}>
              Customer budget
            </div>
            <strong>{req.budgetPkr != null ? `Rs. ${req.budgetPkr}` : 'Not set'}</strong>
          </div>
        </div>
      </div>

      {statusNote && (
        <p className="status-note" style={{ marginTop: 14 }} role="status">
          {statusNote}
        </p>
      )}

      {!myQuote && ['searching', 'offers_received', 'open', 'quoted'].includes(req.status) && (
        <div className="content-card stack" style={{ marginTop: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Send offer</h3>
          <p className="field-hint">Enter your price in PKR and arrival time. You can withdraw later.</p>
          <div>
            <label className="form-label" htmlFor="offer-amount">
              Your price (PKR) <span className="req">required</span>
            </label>
            <input
              id="offer-amount"
              type="number"
              className="input"
              value={amount}
              min={100}
              inputMode="numeric"
              onChange={(e) => setAmount(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="offer-eta">
              Arrival time (minutes) <span className="req">required</span>
            </label>
            <input
              id="offer-eta"
              type="number"
              className="input"
              value={eta}
              min={5}
              inputMode="numeric"
              onChange={(e) => setEta(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="offer-message">
              Message <span className="opt">optional</span>
            </label>
            <textarea
              id="offer-message"
              className="textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!canSendOffer || loading}
            onClick={sendOffer}
            title={!canSendOffer ? 'Enter a price of at least Rs. 100 and ETA of 5+ minutes' : undefined}
          >
            {loading ? 'Sending…' : 'Send offer'}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-block"
            onClick={() => router.push('/worker/home')}
          >
            Decline
          </button>
        </div>
      )}

      {myQuote && (
        <div className="content-card stack" style={{ marginTop: 14 }}>
          <strong>Your offer</strong>
          <div>
            Rs. {myQuote.amountPkr}
            {myQuote.etaMinutes != null ? ` · ${myQuote.etaMinutes} min` : ''} ·{' '}
            {OFFER_STATE_LABEL[myQuote.state] || myQuote.state}
          </div>
          {['active', 'proposed'].includes(myQuote.state) && (
            <button type="button" className="btn btn-outline" disabled={loading} onClick={withdraw}>
              Withdraw offer
            </button>
          )}
          {myQuote.state === 'accepted' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => router.push('/worker/home')}
            >
              Open active booking
            </button>
          )}
          {myQuote.state === 'not_selected' && (
            <button type="button" className="btn btn-secondary" onClick={() => router.push('/worker/home')}>
              Back to opportunities
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="status-note error" style={{ marginTop: 10 }} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
