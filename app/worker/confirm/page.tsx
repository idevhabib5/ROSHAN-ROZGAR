'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Banknote,
  Calendar,
  MapPin,
  Mic,
  Volume2,
  User,
  Wrench,
} from 'lucide-react'
import { AiDisclosure } from '@/components/AiDisclosure'
import { useSession } from '@/components/SessionProvider'
import { useSpeech } from '@/hooks/useSpeech'
import { api } from '@/lib/client'
import { AREAS } from '@/lib/geo'
import { friendlyError } from '@/lib/ui/errors'

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

  const buildSpokenSummary = () => {
    if (!profile) return ''
    return [
      profile.name && `Naam ${profile.name}`,
      profile.trade && `Hunar ${profile.trade}`,
      profile.experienceYears != null && `Tajurba ${profile.experienceYears} saal`,
      (profile.serviceArea || AREAS[areaKey].label) &&
        `Ilaqa ${profile.serviceArea || AREAS[areaKey].label}`,
      profile.visitChargePkr != null && `Qeemat ${profile.visitChargePkr} rupay`,
    ]
      .filter(Boolean)
      .join('. ')
  }

  useEffect(() => {
    if (!profile) return
    const line = buildSpokenSummary()
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
      label: 'Visit charge',
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
      setError(friendlyError(e, 'Could not save your profile. Try again.'))
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
        <h2 className="page-title">Confirm your profile</h2>
      </div>

      <AiDisclosure mode="banner" />

      <div className="content-card stack">
        <p className="section-sub" style={{ marginTop: 0 }}>
          Listen to the summary. Correct by speaking again if anything is wrong. Missing fields stay
          blank — nothing is invented.
        </p>

        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => speak(buildSpokenSummary())}
        >
          <Volume2 size={16} /> Hear profile again
        </button>

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
            <div className="form-label" id="confirm-area">
              Set your work area <span className="req">required</span>
            </div>
            <div
              role="group"
              aria-labelledby="confirm-area"
              style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
            >
              {Object.keys(AREAS).map((k) => (
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
            <p className="field-hint">Cash on completion. No online payment.</p>
          </div>
        )}

        {profile.missingFields.length > 0 && (
          <div className="card-soft">
            <strong>Still needed:</strong> {profile.missingFields.join(', ')}
          </div>
        )}

        {error && (
          <p className="status-note error" role="alert">
            {error}
          </p>
        )}

        <div className="sticky-actions" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canConfirm || saving}
            onClick={confirm}
            title={!canConfirm ? 'Fill all required profile fields first' : undefined}
          >
            {saving ? 'Saving…' : 'Confirm profile'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => router.push('/worker/onboarding')}
          >
            <Mic size={16} /> Speak again
          </button>
        </div>
      </div>
    </div>
  )
}
