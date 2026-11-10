'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Banknote,
  Calendar,
  MapPin,
  Mic,
  Sparkles,
  User,
  Wrench,
} from 'lucide-react'
import { useSession } from '@/components/SessionProvider'
import { useSpeech } from '@/hooks/useSpeech'
import { api } from '@/lib/client'
import { AREAS } from '@/lib/geo'

export default function WorkerConfirmPage() {
  const router = useRouter()
  const { session, setWorkerId, setPendingProfile, ready, patch } = useSession()
  const { speak } = useSpeech()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [areaKey, setAreaKey] = useState('G-11')
  const profile = session.pendingProfile

  useEffect(() => {
    if (!ready) return
    if (!profile) router.replace('/worker/onboarding')
  }, [ready, profile, router])

  useEffect(() => {
    if (!profile) return
    const line = [
      profile.name && `Naam ${profile.name}`,
      profile.trade && `Hunar ${profile.trade}`,
      profile.experienceYears != null && `Tajurba ${profile.experienceYears} saal`,
      (profile.serviceArea || AREAS[areaKey].label) &&
        `Ilaqa ${profile.serviceArea || AREAS[areaKey].label}`,
      profile.visitChargePkr != null && `Qeemat ${profile.visitChargePkr} rupay`,
    ]
      .filter(Boolean)
      .join('. ')
    if (line) speak(line)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.transcript])

  if (!profile) {
    return (
      <div className="screen narrow">
        <div className="loading-state">Loading profile…</div>
      </div>
    )
  }

  const serviceArea = profile.serviceArea || AREAS[areaKey].label
  const fields = [
    { icon: User, label: 'Name', value: profile.name },
    { icon: Wrench, label: 'Trade', value: profile.trade },
    {
      icon: Calendar,
      label: 'Experience',
      value: profile.experienceYears != null ? `${profile.experienceYears} years` : null,
    },
    { icon: MapPin, label: 'Work area', value: serviceArea },
    {
      icon: Banknote,
      label: 'Indicative visit charge',
      value: profile.visitChargePkr != null ? `Rs. ${profile.visitChargePkr}` : null,
    },
  ]

  const canConfirm =
    profile.name &&
    profile.trade &&
    profile.experienceYears != null &&
    serviceArea &&
    profile.visitChargePkr != null

  const confirm = async () => {
    if (!canConfirm) return
    setSaving(true)
    setError(null)
    try {
      const worker = await api<{ id: string }>('/api/workers', {
        method: 'POST',
        body: JSON.stringify({
          displayName: profile.name,
          trade: profile.trade,
          experienceYears: profile.experienceYears,
          serviceArea,
          visitChargePkr: profile.visitChargePkr,
          onboardingMethod: 'voice',
        }),
      })
      setWorkerId(worker.id)
      setPendingProfile(null)
      patch({ role: 'worker' })
      router.push('/worker/home')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="screen narrow">
      <div className="page-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => router.push('/worker/onboarding')}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h2>Does this sound right?</h2>
      </div>

      <div className="content-card stack">
        <div style={{ textAlign: 'center' }}>
          <span className="badge badge-success">
            <Sparkles size={12} /> AI ()
          </span>
          <p className="section-sub" style={{ marginTop: 12, marginBottom: 0 }}>
            Galat ho to dobara bolain. Missing fields invent nahi kiye jayenge.
          </p>
        </div>

        <div className="card">
          {fields.map(({ icon: Icon, label, value }) => (
            <div className="field-row" key={label}>
              <div className="field-icon">
                <Icon size={18} />
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {label}
                </div>
                <strong>{value || '— missing'}</strong>
              </div>
            </div>
          ))}
        </div>

        {!profile.serviceArea && (
          <div>
            <div className="muted" style={{ marginBottom: 8 }}>
              Set your work area
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.keys(AREAS).map((k) => (
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
            <p className="muted" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
              Cash on completion. No online payment.
            </p>
          </div>
        )}

        {profile.missingFields.length > 0 && (
          <div className="card-soft">
            <strong>Still needed:</strong> {profile.missingFields.join(', ')}
          </div>
        )}

        {error && <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{error}</p>}

        <div className="sticky-actions" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canConfirm || saving}
            onClick={confirm}
          >
            {saving ? 'Saving…' : 'Tasdeeq Karein'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => router.push('/worker/onboarding')}
          >
            <Mic size={16} /> Dobara Bolain
          </button>
        </div>
      </div>
    </div>
  )
}
