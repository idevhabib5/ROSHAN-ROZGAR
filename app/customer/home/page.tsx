'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Hammer, Mic, Sparkles, Wind, Wrench, Zap } from 'lucide-react'
import { AiDisclosure } from '@/components/AiDisclosure'
import { BottomNav } from '@/components/BottomNav'
import { CustomerFlowSteps } from '@/components/FlowSteps'
import { useSession } from '@/components/SessionProvider'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { api } from '@/lib/client'
import { AREA_KEYS, AREAS } from '@/lib/geo'
import { friendlyError } from '@/lib/ui/errors'

const SERVICES = [
  { id: 'Plumber', label: 'Plumber', urdu: 'پلمبر', Icon: Wrench },
  { id: 'Electrician', label: 'Electrician', urdu: 'الیکٹریشن', Icon: Zap },
  { id: 'AC Technician', label: 'AC Technician', urdu: 'اے سی', Icon: Wind },
  { id: 'Carpenter', label: 'Carpenter', urdu: 'کارپینٹر', Icon: Hammer },
]

const EXAMPLE =
  'Mere kitchen mein pipe leak ho raha hai. Mujhe F-10 Islamabad mein aaj plumber chahiye. Budget 1500 rupay.'

const POPULAR = ['F-10', 'F-11', 'G-10', 'G-11', 'G-9', 'I-8', 'BLUE AREA', 'F-8', 'G-8', 'H-9']

export default function CustomerHomePage() {
  const router = useRouter()
  const { session, patch } = useSession()
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
  } = useVoiceInput('customer')
  const [selected, setSelected] = useState('Plumber')
  const [areaKey, setAreaKey] = useState('F-10')
  const [title, setTitle] = useState('Kitchen leakage repair')
  const [budget, setBudget] = useState(1500)
  const [isDiagnostic, setIsDiagnostic] = useState(false)
  const [showAllAreas, setShowAllAreas] = useState(false)
  const [extracted, setExtracted] = useState<{
    trade: string | null
    issueDescription: string | null
    location: string | null
    urgency: string | null
    preferredTime: string | null
    latitude: number | null
    longitude: number | null
    provider: string
    missingFields: string[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const areaChips = useMemo(
    () => (showAllAreas ? AREA_KEYS : POPULAR.filter((k) => AREAS[k])),
    [showAllAreas],
  )

  const runExtract = async (text: string) => {
    setLoading(true)
    setApiError(null)
    try {
      const result = await api<NonNullable<typeof extracted>>('/api/ai/service-request', {
        method: 'POST',
        body: JSON.stringify({ transcript: text }),
      })
      setExtracted(result)
      if (result?.trade) setSelected(result.trade)
      if (result?.issueDescription) setTitle(result.issueDescription.slice(0, 80))
    } catch (e) {
      setApiError(friendlyError(e, 'Could not understand the request. Try again or type details.'))
    } finally {
      setLoading(false)
    }
  }

  const canPost = Boolean(selected && areaKey && budget >= 100 && (title.trim() || transcript.trim()))

  const continueFlow = async () => {
    if (!canPost || loading) return
    const trade = extracted?.trade || selected
    const location = extracted?.location || AREAS[areaKey].label
    const issue = extracted?.issueDescription || transcript || `${trade} service needed`
    const urgency = extracted?.urgency || 'today'
    const preferredTime = extracted?.preferredTime || 'Today, ASAP'
    setLoading(true)
    setApiError(null)
    try {
      const req = await api<{ id: string; dispatch?: { requestId: string } }>(
        '/api/service-requests',
        {
          method: 'POST',
          body: JSON.stringify({
            customerId: session.customerId,
            trade,
            title: title || `${trade} job`,
            issueDescription: issue,
            location,
            urgency,
            preferredTime,
            budgetPkr: budget,
            isDiagnostic,
            latitude: extracted?.latitude ?? AREAS[areaKey].latitude,
            longitude: extracted?.longitude ?? AREAS[areaKey].longitude,
            startDispatch: true,
          }),
        },
      )
      patch({ requestId: req.id, role: 'customer', selectedWorkerId: null, quoteId: null })
      router.push(`/customer/dispatch/${req.id}`)
    } catch (e) {
      setApiError(
        friendlyError(
          e,
          'We could not submit your request. Check your connection and try once more.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="screen with-nav">
        <p className="kicker">Customer</p>
        <h1 className="section-title">Post a job request</h1>
        <p className="section-sub">
          Choose a service, area, and budget. Nearby workers can send offers in PKR.
        </p>
        <CustomerFlowSteps current="request" />
        <AiDisclosure mode="banner" />

        <div className="panel-grid">
          <div className="content-card stack">
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>What do you need?</h2>
            <div className="service-grid">
              {SERVICES.map(({ id, label, urdu, Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`service-card${selected === id ? ' selected' : ''}`}
                  onClick={() => setSelected(id)}
                >
                  <div className="icon-wrap">
                    <Icon size={22} />
                  </div>
                  <strong>{label}</strong>
                  <small className="urdu">{urdu}</small>
                </button>
              ))}
            </div>

            <div>
              <label className="form-label" htmlFor="job-title">
                Job title <span className="req">required</span>
              </label>
              <input
                id="job-title"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                aria-required="true"
              />
            </div>

            <div>
              <label className="form-label" htmlFor="job-budget">
                Budget (PKR) <span className="req">required</span>
              </label>
              <input
                id="job-budget"
                type="number"
                className="input"
                min={100}
                inputMode="numeric"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                required
                aria-required="true"
              />
              <p className="field-hint">Cash on completion. No online payment.</p>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={isDiagnostic}
                onChange={(e) => setIsDiagnostic(e.target.checked)}
              />
              Diagnostic / inspection visit
            </label>

            <div>
              <div className="form-label" id="area-label">
                Service location (Islamabad) <span className="req">required</span>
              </div>
              <div
                role="group"
                aria-labelledby="area-label"
                style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 160, overflow: 'auto' }}
              >
                {areaChips.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`chip${areaKey === k ? ' active' : ''}`}
                    aria-pressed={areaKey === k}
                    onClick={() => setAreaKey(k)}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 8 }}
                onClick={() => setShowAllAreas((v) => !v)}
              >
                {showAllAreas ? 'Show popular' : `Show all ${AREA_KEYS.length} areas`}
              </button>
            </div>
          </div>

          <div className="content-card stack">
            <button
              type="button"
              className="card-green"
              style={{ width: '100%', textAlign: 'center' }}
              onClick={() => (listening ? stop() : void start())}
              aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            >
              <div
                className={`mic-btn${listening ? ' recording' : ''}`}
                style={{ width: 72, height: 72, margin: '0 auto 10px' }}
                aria-hidden
              >
                <Mic size={28} />
              </div>
              <strong>Describe the problem</strong>
              <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
                {listening
                  ? speaking
                    ? 'Assistant speaking…'
                    : `Listening via ${providerLabel}…`
                  : `Tap the mic for ${providerLabel} speech, or type below`}
              </p>
            </button>

            {assistantReply && (
              <p className="status-note">
                Assistant: {assistantReply}
              </p>
            )}
            {transport && (
              <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                Voice mode: {transport}
              </p>
            )}

            {!supported && (
              <p className="status-note" style={{ background: '#fff8e6' }}>
                Microphone unavailable. Use the text field instead.
              </p>
            )}
            {error && <p className="status-note error">{error}</p>}

            <div>
              <label className="form-label" htmlFor="issue-text">
                Issue details
              </label>
              <textarea
                id="issue-text"
                className="textarea"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Kitchen leak, F-10, needed today…"
              />
            </div>

            <div className="sticky-actions" style={{ marginTop: 0 }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!transcript.trim() || loading}
                onClick={() => runExtract(transcript.trim())}
              >
                {loading ? 'Understanding…' : 'Understand with AI'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setTranscript(EXAMPLE)}>
                Use sample request
              </button>
            </div>

            {extracted && (
              <div className="card">
                <div className="badge badge-success" style={{ marginBottom: 10 }}>
                  <Sparkles size={12} /> AI ({extracted.provider})
                </div>
                <div className="stack" style={{ gap: 6, fontSize: 14 }}>
                  <div>
                    <span className="muted">Service: </span>
                    <strong>{extracted.trade || '—'}</strong>
                  </div>
                  <div>
                    <span className="muted">Location: </span>
                    <strong>{extracted.location || '—'}</strong>
                  </div>
                  <div>
                    <span className="muted">When: </span>
                    <strong>{extracted.preferredTime || extracted.urgency || 'today'}</strong>
                  </div>
                </div>
              </div>
            )}

            {apiError && (
              <p className="status-note error" role="alert">
                {apiError}
              </p>
            )}

            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={!canPost || loading}
              onClick={continueFlow}
              aria-label={
                !canPost
                  ? 'Find nearby workers — add a title or issue details, service, area, and budget first'
                  : 'Find nearby workers'
              }
            >
              {loading ? 'Posting request…' : 'Find nearby workers'}
            </button>
            {!canPost && (
              <p className="field-hint">Add a title or issue details to continue.</p>
            )}
          </div>
        </div>
      </div>
      <BottomNav role="customer" />
    </>
  )
}
