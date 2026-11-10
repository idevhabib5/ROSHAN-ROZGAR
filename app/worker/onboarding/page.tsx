'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mic, RotateCcw, Square } from 'lucide-react'
import { AiDisclosure } from '@/components/AiDisclosure'
import { useSession } from '@/components/SessionProvider'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { api } from '@/lib/client'
import { TRADES } from '@/lib/geo'

const EXAMPLE =
  'Mera naam Ali Raza hai. Main plumber hoon. Mujhe 5 saal ka tajurba hai. Main Islamabad G-11 mein kaam karta hoon. Meri charge Rs. 2500 hai.'

export default function WorkerOnboardingPage() {
  const router = useRouter()
  const { setPendingProfile } = useSession()
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
  } = useVoiceInput('worker')
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [hintTrade, setHintTrade] = useState<string | null>(null)

  const analyze = async (text: string) => {
    setLoading(true)
    setApiError(null)
    try {
      const result = await api<{
        name: string | null
        trade: string | null
        experienceYears: number | null
        serviceArea: string | null
        visitChargePkr: number | null
        missingFields: string[]
        provider: string
      }>('/api/ai/worker-profile', {
        method: 'POST',
        body: JSON.stringify({ transcript: text }),
      })
      setPendingProfile({
        ...result,
        trade: result.trade || hintTrade,
        transcript: text,
      })
      router.push('/worker/confirm')
    } catch (e) {
      setApiError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen narrow">
      <div className="page-header">
        <button type="button" className="back-btn" onClick={() => router.push('/')} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <h2 className="page-title">Voice profile</h2>
      </div>

      <AiDisclosure mode="banner" />

      <div className="content-card stack">
        <div>
          <p className="kicker">Worker onboarding</p>
          <h1 className="section-title">Say your name and trade</h1>
          <p className="section-sub">
            Speak your name, skill, experience, area, and typical charge. Typing is optional.
          </p>
        </div>

        <div>
          <div className="muted" style={{ marginBottom: 8 }}>
            What do you do? (optional hint)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TRADES.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip${hintTrade === t ? ' active' : ''}`}
                onClick={() => setHintTrade(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

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
                ? 'Assistant speaking…'
                : `Listening via ${providerLabel}…`
              : transcript
                ? 'Ready to continue'
                : `Mic ready (${providerLabel})`}
          </p>
          <button
            type="button"
            className={`mic-btn ${listening ? 'recording' : ''}`}
            onClick={() => (listening ? stop() : void start())}
            aria-label={listening ? 'Stop recording' : 'Start recording'}
          >
            {listening ? <Square size={32} fill="white" /> : <Mic size={36} />}
          </button>
          {assistantReply && (
            <p className="status-note" style={{ marginTop: 12, textAlign: 'left' }}>
              Assistant: {assistantReply}
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
          {error && <p className="status-note error" style={{ marginTop: 8 }}>{error}</p>}
        </div>

        <div className="card-soft" style={{ borderStyle: 'dashed', fontSize: 13 }}>
          <strong style={{ fontSize: 12, color: 'var(--text)' }}>Example:</strong>
          <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
            &ldquo;{EXAMPLE}&rdquo;
          </p>
        </div>

        <div>
          <label className="form-label" htmlFor="worker-voice-text">
            Spoken profile text
          </label>
          <textarea
            id="worker-voice-text"
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
            disabled={!transcript.trim() || loading}
            onClick={() => analyze(transcript.trim())}
          >
            {loading ? 'Understanding…' : 'Continue'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setTranscript(EXAMPLE)}>
            <RotateCcw size={16} /> Use sample voice text
          </button>
        </div>
      </div>
    </div>
  )
}
