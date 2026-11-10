'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mic, Play, Send, Square } from 'lucide-react'
import { useSession } from '@/components/SessionProvider'
import { useSpeech } from '@/hooks/useSpeech'
import { useVoiceNote } from '@/hooks/useVoiceNote'
import { api } from '@/lib/client'
import { friendlyError } from '@/lib/ui/errors'

type Msg = {
  id: string
  senderRole: string
  messageText: string | null
  audioLabel: string | null
  audioDataUrl?: string | null
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
  const { speak } = useSpeech()
  const voice = useVoiceNote()
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
    load().catch((e) => setError(friendlyError(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, workerId])

  const sendMessage = async (args: {
    messageText?: string
    audioLabel?: string
    audioDataUrl?: string
  }) => {
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
          messageText: args.messageText || null,
          audioLabel: args.audioLabel || null,
          audioDataUrl: args.audioDataUrl || null,
        }),
      })
      setText('')
      await load()
    } catch (e) {
      setError(friendlyError(e, 'Could not send the message. Try again.'))
    } finally {
      setLoading(false)
    }
  }

  const toggleMic = async () => {
    setError(null)
    if (voice.recording) {
      const dataUrl = await voice.stop()
      if (!dataUrl) {
        setError(voice.error || 'Could not capture voice note.')
        return
      }
      await sendMessage({
        messageText: 'Voice note',
        audioLabel: 'Customer voice note',
        audioDataUrl: dataUrl,
      })
      return
    }
    await voice.start()
  }

  const acceptQuote = async (quoteId: string) => {
    setLoading(true)
    setError(null)
    try {
      await api(`/api/quotes/${quoteId}/accept`, { method: 'POST' })
      patch({ quoteId })
      await load()
    } catch (e) {
      setError(friendlyError(e, 'Could not accept the price. Try again.'))
    } finally {
      setLoading(false)
    }
  }

  const playMessage = (m: Msg) => {
    if (m.audioDataUrl) {
      const audio = new Audio(m.audioDataUrl)
      void audio.play().catch(() => setError('Could not play this voice note.'))
      return
    }
    if (m.messageText) speak(m.messageText)
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
        <h2 className="page-title">Messages</h2>
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
              Voice notes or text · prices in PKR
            </div>
          </div>
        </div>

        <div className="chat-shell-body">
          <div className="card-soft" style={{ fontSize: 13, marginBottom: 12 }}>
            <strong>Job request:</strong> {issue || '…'}
          </div>

          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble ${m.senderRole === 'customer' ? 'me' : 'them'}`}>
              {(m.audioLabel || m.audioDataUrl) && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{
                    justifyContent: 'flex-start',
                    gap: 8,
                    marginBottom: 4,
                    padding: 0,
                    minHeight: 32,
                    color: 'inherit',
                  }}
                  onClick={() => playMessage(m)}
                  aria-label="Play voice note"
                >
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
                  <span style={{ fontSize: 11, opacity: 0.9 }}>
                    {m.audioLabel || 'Voice note'} · tap to play
                  </span>
                </button>
              )}
              {m.messageText && m.messageText !== 'Voice note' ? m.messageText : null}
              {m.messageText === 'Voice note' && !m.audioDataUrl ? m.audioLabel : null}
            </div>
          ))}

          {latestQuote && (
            <div className="chat-bubble quote">
              <div
                className="price-callout"
                style={{ border: 'none', background: 'transparent', padding: 0 }}
              >
                <div className="muted" style={{ fontSize: 12 }}>
                  Worker quotation
                </div>
                <div className="amount">Rs. {latestQuote.amountPkr}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {agreed ? 'Agreed price' : 'Proposed. Accept to continue'}
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
          {(error || voice.error) && (
            <p className="status-note error" role="alert">
              {error || voice.error}
            </p>
          )}
          {!latestQuote && (
            <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
              Waiting for a worker quote. Open the worker job page and send an offer.
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
                onClick={() =>
                  sendMessage({
                    messageText: 'Can you lower the price a little?',
                    audioLabel: 'Negotiate',
                  })
                }
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
              Confirm booking
            </button>
          )}
        </div>

        <div className="chat-shell-footer">
          <button
            type="button"
            className={`btn ${voice.recording ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{ borderRadius: 999, minWidth: 48, padding: 0 }}
            onClick={() => void toggleMic()}
            aria-label={voice.recording ? 'Stop and send voice note' : 'Record voice note'}
            disabled={loading}
          >
            {voice.recording ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
          </button>
          <input
            className="input"
            style={{ borderRadius: 999, minHeight: 44 }}
            placeholder={voice.recording ? 'Recording… tap stop to send' : 'Type a message…'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={voice.recording}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ borderRadius: 999, minWidth: 48, padding: 0 }}
            disabled={!text.trim() || loading || voice.recording}
            onClick={() => sendMessage({ messageText: text.trim() })}
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
