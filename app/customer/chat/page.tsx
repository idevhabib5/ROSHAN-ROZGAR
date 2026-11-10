'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mic, Play, Send } from 'lucide-react'
import { DemoBridge } from '@/components/DemoBridge'
import { useSession } from '@/components/SessionProvider'
import { api } from '@/lib/client'

type Msg = {
  id: string
  senderRole: string
  messageText: string | null
  audioLabel: string | null
}

type Quote = {
  id: string
  amountPkr: number
  state: string
  workerId: string
}

export default function ChatPage() {
  const router = useRouter()
  const { session, patch } = useSession()
  const [messages, setMessages] = useState<Msg[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [workerName, setWorkerName] = useState('Worker')
  const [workerPhoto, setWorkerPhoto] = useState<string | null>(null)
  const [issue, setIssue] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const requestId = session.requestId
  const workerId = session.selectedWorkerId

  const load = async () => {
    if (!requestId || !workerId) throw new Error('Missing request or worker')
    const req = await api<{
      issueDescription: string
      messages: Msg[]
      quotes: Quote[]
    }>(`/api/service-requests/${requestId}`)
    setIssue(req.issueDescription)
    setMessages(req.messages)
    setQuotes(req.quotes.filter((q) => q.workerId === workerId))
    const w = await api<{ displayName: string; photoUrl?: string | null }>(`/api/workers/${workerId}`)
    setWorkerName(w.displayName)
    setWorkerPhoto(w.photoUrl || null)
  }

  useEffect(() => {
    if (!requestId || !workerId) {
      router.replace('/customer/home')
      return
    }
    load().catch((e) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, workerId])

  const sendMessage = async (messageText: string, audioLabel?: string) => {
    if (!requestId || !workerId) return
    setLoading(true)
    setError(null)
    try {
      await api('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          requestId,
          workerId,
          senderRole: 'customer',
          senderId: session.customerId,
          messageText,
          audioLabel: audioLabel || null,
        }),
      })
      setText('')
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const acceptQuote = async (quoteId: string) => {
    setLoading(true)
    setError(null)
    try {
      await api(`/api/quotes/${quoteId}/accept`, { method: 'POST' })
      patch({ quoteId })
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const latestQuote = quotes[0]
  const agreed = latestQuote?.state === 'accepted'

  return (
    <div className="screen narrow">
      <div className="page-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => router.push(`/customer/workers/${workerId}`)}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h2>Let&apos;s talk it through</h2>
      </div>

      <div className="chat-shell">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              workerPhoto ||
              'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=200&h=200&fit=crop&crop=face'
            }
            alt=""
            className="avatar"
          />
          <div>
            <strong>{workerName}</strong>
            <div className="muted" style={{ fontSize: 12 }}>
              Clear work · clear price
            </div>
          </div>
        </div>

        <div className="chat-shell-body">
          <div className="card-soft" style={{ fontSize: 13, marginBottom: 12 }}>
            <strong>Job request:</strong> {issue || '…'}
          </div>

          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble ${m.senderRole === 'customer' ? 'me' : 'them'}`}>
              {m.audioLabel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      background:
                        m.senderRole === 'customer' ? 'rgba(255,255,255,0.25)' : 'var(--primary)',
                      color: '#fff',
                    }}
                  >
                    <Play size={12} fill="currentColor" />
                  </span>
                  <span style={{ fontSize: 11, opacity: 0.85 }}>{m.audioLabel}</span>
                </div>
              )}
              {m.messageText}
            </div>
          ))}

          {latestQuote && (
            <div className="chat-bubble quote">
              <div className="price-callout" style={{ border: 'none', background: 'transparent', padding: 0 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Worker quotation
                </div>
                <div className="amount">Rs. {latestQuote.amountPkr}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {agreed ? 'Agreed price' : 'Proposed — accept to continue'}
                </div>
              </div>
            </div>
          )}

          {agreed && (
            <div className="card-green">
              <strong>Agreed: Rs. {latestQuote.amountPkr}</strong>
              <p className="muted" style={{ marginTop: 4, marginBottom: 0 }}>
                Next: confirm booking (cash on completion).
              </p>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          {error && <p style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</p>}
          {!latestQuote && (
            <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
              Waiting for worker quote. Use Demo bridge → Worker → open job → send quote.
            </p>
          )}
          {latestQuote && !agreed && (
            <div className="sticky-actions" style={{ marginTop: 0, paddingTop: 0 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={loading}
                onClick={() => acceptQuote(latestQuote.id)}
              >
                Accept price
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={loading}
                onClick={() => sendMessage('Qeemat thori kam kar dein?', 'Negotiate voice')}
              >
                Negotiate
              </button>
            </div>
          )}
          {agreed && (
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => router.push('/customer/booking')}
            >
              Clear work · confirm booking
            </button>
          )}
        </div>

        <div className="chat-shell-footer">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: 999, minWidth: 48, padding: 0 }}
            onClick={() => sendMessage('Kitchen mein leakage hai.', 'Customer voice note')}
          >
            <Mic size={18} />
          </button>
          <input
            className="input"
            style={{ borderRadius: 999, minHeight: 44 }}
            placeholder="Optional text…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ borderRadius: 999, minWidth: 48, padding: 0 }}
            disabled={!text.trim() || loading}
            onClick={() => sendMessage(text.trim())}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <DemoBridge
        hint="Worker ko quote bhejne ke liye Worker mode mein job open karein."
        workerHref={requestId ? `/worker/jobs/${requestId}` : '/worker/home'}
        customerHref="/customer/chat"
      />
    </div>
  )
}
