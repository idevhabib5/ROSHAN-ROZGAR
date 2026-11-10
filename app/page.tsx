'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession as useAuthSession } from 'next-auth/react'
import { MapPin, Mic2, ShieldCheck, Sparkles } from 'lucide-react'
import { useSession } from '@/components/SessionProvider'

type Lang = 'roman' | 'urdu' | 'en'

const COPY: Record<
  Lang,
  {
    kicker: string
    title: string
    lead: string
    features: [string, string, string]
    voiceHint: string
    demoNote: string
    heroTitle: string
    heroSub: string
    heroPill: string
    ctaSignup: string
    ctaLogin: string
  }
> = {
  roman: {
    kicker: 'Roshan Rozgar',
    title: 'Good work. Brighter tomorrows.',
    lead: 'Assalam-o-Alaikum. Ghar ke kaam ke liye bharosemand hunarmand. Account banayein, phir short setup — Roshan Assistant awaz se details lega.',
    features: ['Voice onboarding', 'Nearby workers', 'Clear pricing'],
    voiceHint:
      'Sign up ya log in karein. Setup form mein role chunein — Roshan Assistant baqi awaz se poochega.',
    demoNote: 'Cash on completion. No online payment.',
    heroTitle: 'Ghar ke Kaam ke Liye',
    heroSub: 'Bharosemand Hunarmand. Qareeb, dastiyab, clear qeemat',
    heroPill: 'Voice-first · Islamabad',
    ctaSignup: 'Sign up',
    ctaLogin: 'Log in',
  },
  urdu: {
    kicker: 'روشن روزگار',
    title: 'اچھا کام۔ روشن کل۔',
    lead: 'السلام علیکم۔ گھر کے کام کے لیے بھروسے مند ہنرمند۔ اکاؤنٹ بنائیں، پھر مختصر سیٹ اپ — روشن اسسٹنٹ آواز سے تفصیلات لے گا۔',
    features: ['آواز سے شروع کریں', 'قریب ورکرز', 'صاف قیمت'],
    voiceHint: 'سائن اَپ یا لاگ اِن کریں۔ سیٹ اپ میں رول چنیں — روشن اسسٹنٹ باقی آواز سے پوچھے گا۔',
    demoNote: 'ادائیگی کام مکمل ہونے پر نقد۔ آن لائن ادائیگی نہیں۔',
    heroTitle: 'گھر کے کام کے لیے',
    heroSub: 'بھروسے مند ہنرمند۔ قریب، دستیاب، صاف قیمت',
    heroPill: 'آواز سے پہلے · اسلام آباد',
    ctaSignup: 'سائن اَپ',
    ctaLogin: 'لاگ اِن',
  },
  en: {
    kicker: 'Roshan Rozgar',
    title: 'Good work. Brighter tomorrows.',
    lead: 'Assalam-o-Alaikum. Trusted tradespeople for home jobs. Create an account, then a short setup — Roshan Assistant collects your details by voice.',
    features: ['Voice onboarding', 'Nearby workers', 'Clear pricing'],
    voiceHint:
      'Sign up or log in. Pick your role in a short form — Roshan Assistant asks for the rest by voice.',
    demoNote: 'Cash on completion. No online payment.',
    heroTitle: 'For household work',
    heroSub: 'Trusted tradespeople. Nearby, available, clear price',
    heroPill: 'Voice-first · Islamabad',
    ctaSignup: 'Sign up',
    ctaLogin: 'Log in',
  },
}

type MeResponse = {
  preferredRole?: string | null
  workerId?: string | null
  customerId?: string | null
}

export default function WelcomePage() {
  const router = useRouter()
  const { patch } = useSession()
  const { data: auth, status } = useAuthSession()
  const [lang, setLang] = useState<Lang>('roman')
  const [checkingProfile, setCheckingProfile] = useState(false)
  const t = COPY[lang]
  const isUrdu = lang === 'urdu'
  const signedIn = status === 'authenticated' && Boolean(auth?.user)

  useEffect(() => {
    if (!signedIn) return
    let cancelled = false
    setCheckingProfile(true)
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((me: MeResponse | null) => {
        if (cancelled) return
        if (me?.preferredRole === 'worker' && me.workerId) {
          patch({ role: 'worker', workerId: me.workerId })
          router.replace('/worker/home')
          return
        }
        if (me?.preferredRole === 'customer' && me.customerId) {
          patch({ role: 'customer', customerId: me.customerId })
          router.replace('/customer/home')
          return
        }
        router.replace('/choose-role')
      })
      .catch(() => {
        if (!cancelled) router.replace('/choose-role')
      })
      .finally(() => {
        if (!cancelled) setCheckingProfile(false)
      })
    return () => {
      cancelled = true
    }
  }, [signedIn, patch, router])

  return (
    <div className="landing" lang={isUrdu ? 'ur' : 'en'}>
      <div className="landing-grid">
        <section className={`landing-copy${isUrdu ? ' urdu' : ''}`}>
          {signedIn && (
            <p className="kicker" style={{ marginBottom: 12 }}>
              Signed in as {auth?.user?.name || auth?.user?.email}
              {checkingProfile ? ' · continuing setup…' : ''}
            </p>
          )}
          <div className="lang-toggle" role="group" aria-label="Language" dir="ltr">
            <button
              type="button"
              className={lang === 'roman' ? 'active' : ''}
              onClick={() => setLang('roman')}
            >
              Roman Urdu
            </button>
            <button
              type="button"
              className={`urdu ${lang === 'urdu' ? 'active' : ''}`}
              onClick={() => setLang('urdu')}
            >
              اردو
            </button>
            <button
              type="button"
              className={lang === 'en' ? 'active' : ''}
              onClick={() => setLang('en')}
            >
              English
            </button>
          </div>

          <p className="kicker">{t.kicker}</p>
          <h1>{t.title}</h1>
          <p className="lead">{t.lead}</p>

          <div className="feature-row">
            <div className="feature-chip">
              <Mic2 size={18} color="var(--primary)" /> {t.features[0]}
            </div>
            <div className="feature-chip">
              <MapPin size={18} color="var(--primary)" /> {t.features[1]}
            </div>
            <div className="feature-chip">
              <Sparkles size={18} color="var(--primary)" /> {t.features[2]}
            </div>
          </div>

          {!signedIn && (
            <div className="landing-cta-row" dir={isUrdu ? 'rtl' : 'ltr'}>
              <Link href="/signup" className="btn btn-primary">
                {t.ctaSignup}
              </Link>
              <Link href="/login" className="btn btn-outline">
                {t.ctaLogin}
              </Link>
            </div>
          )}

          <div className="voice-hint">
            <Mic2 size={18} />
            {t.voiceHint}
          </div>

          <p className="demo-note">{t.demoNote}</p>
        </section>

        <aside className={`landing-hero${isUrdu ? ' urdu' : ''}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="landing-hero-photo"
            src="/landing-hero.jpg"
            alt="Electrician in a hard hat working on a home electrical panel"
          />
          <div className="landing-hero-overlay" aria-hidden="true" />
          <div className="landing-hero-content">
            <div className="hero-pill">
              <ShieldCheck size={14} /> {t.heroPill}
            </div>
            <div className="hero-card">
              <strong>{t.heroTitle}</strong>
              <span>{t.heroSub}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
