'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mic, RotateCcw, Square } from 'lucide-react'
import { AiDisclosure } from '@/components/AiDisclosure'
import { useSession } from '@/components/SessionProvider'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { api, type PendingProfile } from '@/lib/client'
import { TRADES } from '@/lib/geo'
import { friendlyError } from '@/lib/ui/errors'

const EXAMPLE =
  'Mera naam Ali Raza hai. Main plumber hoon. Mujhe 5 saal ka tajurba hai. Main Islamabad G-11 mein kaam karta hoon. Meri charge Rs. 2500 hai.'

const FIELD_LABELS: Record<string, string> = {
  name: 'name',
  trade: 'trade',
  experienceYears: 'years of experience',
  serviceArea: 'work area',
  visitChargePkr: 'visit charge (PKR)',
}

export default function WorkerOnboardingPage() {
  const router = useRouter()
  const { session, setPendingProfile, setWorkerId, patch } = useSession()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [hintTrade, setHintTrade] = useState<string | null>(null)
  const [draft, setDraft] = useState<PendingProfile | null>(session.pendingProfile)
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

        const merged: PendingProfile = {
          name: result.name || draft?.name || null,
          trade: result.trade || hintTrade || draft?.trade || null,
          experienceYears:
            result.experienceYears != null
              ? result.experienceYears
              : (draft?.experienceYears ?? null),
          serviceArea: result.serviceArea || draft?.serviceArea || null,
          visitChargePkr:
            result.visitChargePkr != null
              ? result.visitChargePkr
              : (draft?.visitChargePkr ?? null),
          missingFields: [],
          provider: result.provider,
          transcript: [draft?.transcript, text].filter(Boolean).join(' ').trim(),
        }
        merged.missingFields = (
          ['name', 'trade', 'experienceYears', 'serviceArea', 'visitChargePkr'] as const
        ).filter((k) => merged[k] == null || merged[k] === '')

        setDraft(merged)
        setPendingProfile(merged)

        if (merged.missingFields.length) {
          const ask = `Shukriya. Abhi ${merged.missingFields
            .map((k) => FIELD_LABELS[k] || k)
            .join(', ')} missing hai. Please bataein.`
          speakRef.current(ask)
          setApiError(
            `Still need: ${merged.missingFields.map((k) => FIELD_LABELS[k] || k).join(', ')}`,
          )
          return
        }

        setSaving(true)
        speakRef.current('Shukriya. Profile save ho raha hai.')
        const worker = await api<{ id: string }>('/api/workers', {
          method: 'POST',
          body: JSON.stringify({
            displayName: merged.name,
            trade: merged.trade,
            experienceYears: merged.experienceYears,
            serviceArea: merged.serviceArea,
            visitChargePkr: merged.visitChargePkr,
            onboardingMethod: 'voice',
          }),
        })
        setWorkerId(worker.id)
        setPendingProfile(null)
        patch({ role: 'worker', workerId: worker.id })
        router.push('/worker/home')
      } catch (e) {
        setApiError(friendlyError(e, 'Could not save your profile. Try again.'))
      } finally {
        setLoading(false)
        setSaving(false)
        analyzingRef.current = false
      }
    },
    [draft, hintTrade, patch, router, setPendingProfile, setWorkerId],
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
  } = useVoiceInput('worker', {
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
        <h2 className="page-title">Voice profile</h2>
      </div>

      <AiDisclosure mode="banner" />

      <div className="content-card stack">
        <div>
          <p className="kicker">Step 2 of 2 · Worker</p>
          <h1 className="section-title">Say your name and trade</h1>
          <p className="section-sub">
            Roshan Assistant will thank you when you finish speaking, then continue automatically.
            Typing is optional.
          </p>
        </div>

        {draft && (
          <div className="card-soft" style={{ fontSize: 13 }}>
            <div>
              <span className="muted">Heard so far — </span>
              {[
                draft.name && `Name: ${draft.name}`,
                draft.trade && `Trade: ${draft.trade}`,
                draft.experienceYears != null && `Exp: ${draft.experienceYears}y`,
                draft.serviceArea && `Area: ${draft.serviceArea}`,
                draft.visitChargePkr != null && `Rs. ${draft.visitChargePkr}`,
              ]
                .filter(Boolean)
                .join(' · ') || 'Nothing yet'}
            </div>
          </div>
        )}

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
                ? 'Roshan Assistant speaking…'
                : `Listening via ${providerLabel}…`
              : saving
                ? 'Saving profile…'
                : loading
                  ? 'Understanding…'
                  : draft?.missingFields?.length
                    ? `Still need: ${draft.missingFields.map((k) => FIELD_LABELS[k] || k).join(', ')}`
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
