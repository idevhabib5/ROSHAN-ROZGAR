'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Hammer, Mic, Sparkles, Wind, Wrench, Zap } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { DemoBridge } from '@/components/DemoBridge'
import { useSession } from '@/components/SessionProvider'
import { useSpeech } from '@/hooks/useSpeech'
import { api } from '@/lib/client'
import { AREA_KEYS, AREAS } from '@/lib/geo'

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
  const { supported, listening, transcript, setTranscript, error, start, stop } = useSpeech()
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
      setApiError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const continueFlow = async () => {
    const trade = extracted?.trade || selected
    const location = extracted?.location || AREAS[areaKey].label
    const issue = extracted?.issueDescription || transcript || `${trade} service chahiye`
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
      setApiError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="screen with-nav">
        <p className="kicker">Customer</p>
        <h1 className="section-title">Need a helping hand?</h1>
        <p className="section-sub">
          Post a job with budget + Islamabad area — nearby available workers get a live alert and
          send competing offers.
        </p>

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

            <label className="muted" style={{ fontSize: 12 }}>
              Job title
              <input
                className="input"
                style={{ marginTop: 6 }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <label className="muted" style={{ fontSize: 12 }}>
              Budget (PKR)
              <input
                type="number"
                className="input"
                style={{ marginTop: 6 }}
                min={100}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
              />
            </label>

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
              <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                Service location (Islamabad)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 160, overflow: 'auto' }}>
                {areaChips.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`chip${areaKey === k ? ' active' : ''}`}
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
              onClick={() => (listening ? stop() : start())}
            >
              <div
                className={`mic-btn${listening ? ' recording' : ''}`}
                style={{ width: 72, height: 72, margin: '0 auto 10px' }}
              >
                <Mic size={28} />
              </div>
              <strong>Let your voice begin</strong>
              <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
                {listening ? 'Listening…' : 'Tap mic — describe the problem'}
              </p>
            </button>

            {!supported && (
              <p style={{ fontSize: 12, color: 'var(--warning)', margin: 0 }}>
                STT unsupported — text fallback use karein.
              </p>
            )}
            {error && <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{error}</p>}

            <textarea
              className="textarea"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Kitchen leak, F-10, aaj chahiye…"
            />

            <div className="sticky-actions" style={{ marginTop: 0 }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!transcript.trim() || loading}
                onClick={() => runExtract(transcript.trim())}
              >
                {loading ? 'Understanding…' : 'AI se Samjhein'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setTranscript(EXAMPLE)}>
                Demo request
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
              <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{apiError}</p>
            )}

            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={loading}
              onClick={continueFlow}
            >
              {loading ? 'Broadcasting…' : 'Find nearby workers'}
            </button>

            <DemoBridge
              hint="Workers must be Available ON with fresh location. After posting, stay on Finding screen."
              workerHref="/worker/home"
              customerHref="/customer/home"
            />
          </div>
        </div>
      </div>
      <BottomNav role="customer" />
    </>
  )
}
