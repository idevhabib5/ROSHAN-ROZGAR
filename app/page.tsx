'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession as useAuthSession } from 'next-auth/react'
import {
  ChevronRight,
  HardHat,
  Home,
  MapPin,
  Mic2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useSession } from '@/components/SessionProvider'
import { DEMO_IDS } from '@/lib/session'

type Lang = 'roman' | 'urdu' | 'en'

const COPY: Record<
  Lang,
  {
    kicker: string
    title: string
    lead: string
    features: [string, string, string]
    workerTitle: string
    workerDesc: string
    customerTitle: string
    customerDesc: string
    voiceHint: string
    demoNote: string
    heroTitle: string
    heroSub: string
    heroPill: string
  }
> = {
  roman: {
    kicker: 'Roshan Rozgar',
    title: 'Good work. Brighter tomorrows.',
    lead: 'Assalam-o-Alaikum. Ghar ke kaam ke liye bharosemand hunarmand. Voice se shuru karein, qareeb workers dhoondhein, qeemat clear rakhein, booking confirm karein.',
    features: ['Voice onboarding', 'Nearby workers', 'Clear pricing'],
    workerTitle: 'Main Hunarmand Hoon',
    workerDesc: 'Worker. Mic dabayein, apna naam batayein. Typing optional.',
    customerTitle: 'Mujhe Hunarmand Chahiye',
    customerDesc: 'Customer. Qareeb worker dhoondhein jo abhi dastiyab ho.',
    voiceHint:
      'AI awaz se naam, hunar, ilaqa aur masla samajhta hai. Cash on completion, no online payment.',
    demoNote: 'Demo roles: Ahmed Khan (customer) and Ali Raza (worker).',
    heroTitle: 'Ghar ke Kaam ke Liye',
    heroSub: 'Bharosemand Hunarmand. Qareeb, dastiyab, clear qeemat',
    heroPill: 'Voice-first · Islamabad',
  },
  urdu: {
    kicker: 'روشن روزگار',
    title: 'اچھا کام۔ روشن کل۔',
    lead: 'السلام علیکم۔ گھر کے کام کے لیے بھروسے مند ہنرمند۔ آواز سے شروع کریں، قریب ورکرز تلاش کریں، قیمت صاف رکھیں، بکنگ کنفرم کریں۔',
    features: ['آواز سے شروع کریں', 'قریب ورکرز', 'صاف قیمت'],
    workerTitle: 'میں ہنرمند ہوں',
    workerDesc: 'ورکر۔ مائیک دبائیں، اپنا نام بتائیں۔ ٹائپنگ اختیاری۔',
    customerTitle: 'مجھے ہنرمند چاہیے',
    customerDesc: 'کسٹمر۔ قریب دستیاب ورکر تلاش کریں۔',
    voiceHint:
      'اے آئی آواز سے نام، ہنر، علاقہ اور مسئلہ سمجھتا ہے۔ ادائیگی کام مکمل ہونے پر نقد؛ آن لائن ادائیگی نہیں۔',
    demoNote: 'ڈیمو رولز: احمد خان (کسٹمر) اور علی رضا (ورکر)۔',
    heroTitle: 'گھر کے کام کے لیے',
    heroSub: 'بھروسے مند ہنرمند۔ قریب، دستیاب، صاف قیمت',
    heroPill: 'آواز سے پہلے · اسلام آباد',
  },
  en: {
    kicker: 'Roshan Rozgar',
    title: 'Good work. Brighter tomorrows.',
    lead: 'Assalam-o-Alaikum. Trusted tradespeople for home jobs. Start with your voice, find nearby workers, keep the price clear, and confirm the booking.',
    features: ['Voice onboarding', 'Nearby workers', 'Clear pricing'],
    workerTitle: "I'm a skilled worker",
    workerDesc: 'Worker. Tap the mic, say your name. Typing optional.',
    customerTitle: 'I need a skilled worker',
    customerDesc: 'Customer. Find a nearby available worker.',
    voiceHint:
      'AI understands name, trade, area, and issue from speech. Cash on completion, no online payment.',
    demoNote: 'Demo roles: Ahmed Khan (customer) and Ali Raza (worker).',
    heroTitle: 'For household work',
    heroSub: 'Trusted tradespeople. Nearby, available, clear price',
    heroPill: 'Voice-first · Islamabad',
  },
}

export default function WelcomePage() {
  const router = useRouter()
  const { patch } = useSession()
  const { data: auth } = useAuthSession()
  const [lang, setLang] = useState<Lang>('roman')
  const t = COPY[lang]
  const isUrdu = lang === 'urdu'

  return (
    <div className="landing" lang={isUrdu ? 'ur' : 'en'}>
      <div className="landing-grid">
        <section className={`landing-copy${isUrdu ? ' urdu' : ''}`}>
          {auth?.user && (
            <p className="kicker" style={{ marginBottom: 12 }}>
              Signed in as {auth.user.name || auth.user.email}
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

          <div className="role-stack" style={{ marginTop: 8 }} dir={isUrdu ? 'rtl' : 'ltr'}>
            <button
              type="button"
              className="role-card"
              onClick={() => {
                patch({
                  role: 'worker',
                  workerId: DEMO_IDS.workerAli,
                  pendingProfile: null,
                })
                router.push('/worker/onboarding')
              }}
            >
              <div className="role-icon">
                <HardHat size={26} strokeWidth={2.2} />
              </div>
              <div>
                <strong>{t.workerTitle}</strong>
                <span>{t.workerDesc}</span>
              </div>
              <ChevronRight className="chev" size={20} />
            </button>

            <button
              type="button"
              className="role-card"
              onClick={() => {
                patch({
                  role: 'customer',
                  customerId: DEMO_IDS.customerAhmed,
                })
                router.push('/customer/home')
              }}
            >
              <div className="role-icon">
                <Home size={26} strokeWidth={2.2} />
              </div>
              <div>
                <strong>{t.customerTitle}</strong>
                <span>{t.customerDesc}</span>
              </div>
              <ChevronRight className="chev" size={20} />
            </button>
          </div>

          <div className="voice-hint">
            <Mic2 size={18} />
            {t.voiceHint}
          </div>

          <p className="demo-note">{t.demoNote}</p>
        </section>

        <aside className={`landing-hero${isUrdu ? ' urdu' : ''}`} aria-hidden="true">
          <div className="hero-pill">
            <ShieldCheck size={14} /> {t.heroPill}
          </div>
          <div className="hero-card">
            <strong>{t.heroTitle}</strong>
            <span>{t.heroSub}</span>
          </div>
        </aside>
      </div>
    </div>
  )
}
