'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession as useAuthSession } from 'next-auth/react'
import { ArrowLeft, Mic, RotateCcw, Square } from 'lucide-react'
import { AiDisclosure } from '@/components/AiDisclosure'
import { useSession } from '@/components/SessionProvider'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { api } from '@/lib/client'
import { friendlyError } from '@/lib/ui/errors'

const EXAMPLE = 'Mera naam Ahmed Khan hai. Main F-10 Islamabad mein rehta hoon.'

const FIELD_LABELS: Record<string, string> = {
  name: 'name',
  serviceArea: 'area (e.g. F-10)',
}

export default function CustomerOnboardingPage() {
  const router = useRouter()
  const { data: auth } = useAuthSession()
  const { patch } = useSession()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [missing, setMissing] = useState<string[]>([])
  const [draft, setDraft] = useState<{ name: string | null; serviceArea: string | null }>({
    name: auth?.user?.name || null,
    serviceArea: null,
  })
  const analyzingRef = useRef(false)
  const speakRef = useRef<(text: string) => void>(() => undefined)

  const analyze = useCallback(
    async (text: string, { fromVoice = false }: { fromVoice?: boolean } = {}) => {
      if (!text.trim() || analyzingRef.current) return
      analyzingRef.current = true
      setLoading(true)
      setApiError(null)
      try {
        if (fromVoice) {
          speakRef.current(
            'Shukriya. Roshan Assistant ab aapki baat samajh raha hai.',
          )
        }

        const result = await api<{
          name: string | null
          serviceArea: string | null
          missingFields: string[]
          provider: string
        }>('/api/ai/customer-profile', {
          method: 'POST',
          body: JSON.stringify({ transcript: text }),
        })

        const next = {
          name: result.name || draft.name,
          serviceArea: result.serviceArea || draft.serviceArea,
        }
        const stillMissing = (['name', 'serviceArea'] as const).filter((k) => !next[k])
        setDraft(next)
        setMissing(stillMissing)

        if (stillMissing.length) {
          const ask = `Shukriya. Mujhe abhi ${stillMissing
            .map((k) => FIELD_LABELS[k])
            .join(' aur ')} chahiye. Please bataein.`
          speakRef.current(ask)
          setApiError(`Still need: ${stillMissing.map((k) => FIELD_LABELS[k]).join(', ')}`)
          return
        }

        setSaving(true)
        speakRef.current('Shukriya. Aapka profile save ho raha hai.')
        const customer = await api<{ id: string }>('/api/customers', {
          method: 'POST',
          body: JSON.stringify({
            displayName: next.name,
            serviceArea: next.serviceArea,
            photoUrl: auth?.user?.image || null,
          }),
        })
        patch({ role: 'customer', customerId: customer.id })
        router.push('/customer/home')
      } catch (e) {
        setApiError(friendlyError(e, 'Could not understand. Try again.'))
      } finally {
        setLoading(false)
        setSaving(false)
        analyzingRef.current = false
      }
    },
    [auth?.user?.image, draft.name, draft.serviceArea, patch, router],
  )

  const {
    supported,
    listening,
    speaking,
    transcript,
    setTranscript,
    assistantReply,
    error,
    transport,
    providerLabel,
    start,
    stop,
    speak,
  } = useVoiceInput('customerProfile', {
    onSpeechComplete: (text) => {
      void analyze(text, { fromVoice: true })
    },
  })

  speakRef.current = speak

  return (
    <div className="screen narrow">
      <div className="page-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => router.push('/choose-role')}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="page-title">Your details</h2>
      </div>

      <AiDisclosure mode="banner" />

      <div className="content-card stack">
        <div>
          <p className="kicker">Step 2 of 2 · Customer</p>
          <h1 className="section-title">Tell us your name and area</h1>
          <p className="section-sub">
            Roshan Assistant will thank you when you finish speaking, then continue automatically.
            Typing is optional.
          </p>
        </div>

        {(draft.name || draft.serviceArea) && (
          <div className="card-soft" style={{ fontSize: 14 }}>
            <div>
              <span className="muted">Name: </span>
              <strong>{draft.name || '—'}</strong>
            </div>
            <div style={{ marginTop: 6 }}>
              <span className="muted">Area: </span>
              <strong>{draft.serviceArea || '—'}</strong>
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '8px 0 4px',
            width: '100%',
          }}
        >
          <div className={`waveform ${listening ? '' : 'idle'}`} aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} />
            ))}
          </div>
          <p className="muted" style={{ marginBottom: 16 }}>
            {listening
              ? speaking
                ? 'Roshan Assistant speaking…'
                : `Listening via ${providerLabel}…`
              : loading || saving
                ? saving
                  ? 'Saving…'
                  : 'Understanding…'
                : missing.length
                  ? `Still need: ${missing.map((k) => FIELD_LABELS[k]).join(', ')}`
                  : `Mic ready (${providerLabel})`}
          </p>
          <button
            type="button"
            className={`mic-btn ${listening ? 'recording' : ''}`}
            disabled={loading || saving}
            onClick={() => (listening ? stop() : void start())}
            aria-label={listening ? 'Stop recording' : 'Start recording'}
          >
            {listening ? <Square size={32} fill="white" /> : <Mic size={36} />}
          </button>
          {assistantReply && (
            <p className="status-note" style={{ marginTop: 12, textAlign: 'left' }}>
              Roshan Assistant: {assistantReply}
            </p>
          )}
          {transport && (
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Voice mode: {transport}
            </p>
          )}
          {!supported && (
            <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 12 }}>
              Microphone unavailable. Use the text field.
            </p>
          )}
          {error && (
            <p className="status-note error" style={{ marginTop: 8 }}>
              {error}
            </p>
          )}
        </div>

        <div className="card-soft" style={{ borderStyle: 'dashed', fontSize: 13 }}>
          <strong style={{ fontSize: 12, color: 'var(--text)' }}>Example:</strong>
          <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
            &ldquo;{EXAMPLE}&rdquo;
          </p>
        </div>

        <div>
          <label className="form-label" htmlFor="customer-voice-text">
            Spoken details
          </label>
          <textarea
            id="customer-voice-text"
            className="textarea"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Your spoken words appear here…"
          />
        </div>

        {apiError && <p className="status-note error">{apiError}</p>}

        <div className="sticky-actions" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!transcript.trim() || loading || saving}
            onClick={() => void analyze(transcript.trim())}
          >
            {saving ? 'Saving…' : loading ? 'Understanding…' : 'Continue'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setTranscript(EXAMPLE)}>
            <RotateCcw size={16} /> Use sample voice text
          </button>
        </div>
      </div>
    </div>
  )
}
