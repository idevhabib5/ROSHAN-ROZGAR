'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
    lead: 'Assalam-o-Alaikum — ghar ke kaam ke liye bharosemand hunarmand. Voice se shuru karein, qareeb workers dhoondhein, qeemat clear rakhein, booking confirm karein.',
    features: ['Let your voice begin', 'Nearby & available', 'Clear price & trust'],
    workerTitle: 'Main Hunarmand Hoon',
    workerDesc: 'Worker — mic dabayein, apna naam batayein. Typing optional.',
    customerTitle: 'Mujhe Hunarmand Chahiye',
    customerDesc: 'Customer — qareeb helping hand dhoondhein, jo abhi dastiyab ho.',
    voiceHint:
      'AI awaz se naam, hunar, ilaqa aur masla samajhta hai — cash on completion, no online payment.',
    demoNote:
      'Demo identities (no real login): Ahmed Khan customer + Ali Raza worker. Auth is simulated for hackathon only.',
    heroTitle: 'Ghar ke Kaam ke Liye',
    heroSub: 'Bharosemand Hunarmand — qareeb, dastiyab, clear qeemat',
    heroPill: 'Voice-first · Islamabad',
  },
  urdu: {
    kicker: 'روشن روزگار',
    title: 'اچھا کام۔ روشن کل۔',
    lead: 'السلام علیکم — گھر کے کام کے لیے بھروسے مند ہنرمند۔ آواز سے شروع کریں، قریب ورکرز تلاش کریں، قیمت صاف رکھیں، بکنگ کنفرم کریں۔',
    features: ['اپنی آواز سے شروع کریں', 'قریب اور دستیاب', 'صاف قیمت اور اعتماد'],
    workerTitle: 'میں ہنرمند ہوں',
    workerDesc: 'ورکر — مائیک دبائیں، اپنا نام بتائیں۔ ٹائپنگ اختیاری۔',
    customerTitle: 'مجھے ہنرمند چاہیے',
    customerDesc: 'کسٹمر — قریب مددگار تلاش کریں جو ابھی دستیاب ہو۔',
    voiceHint:
      'اے آئی آواز سے نام، ہنر، علاقہ اور مسئلہ سمجھتا ہے — ادائیگی کام مکمل ہونے پر نقد، آن لائن ادائیگی نہیں۔',
    demoNote:
      'ڈیمو شناخت (اصل لاگ اِن نہیں): احمد خان کسٹمر + علی رضا ورکر۔ ہیکاتھون کے لیے نقلی تصدیق۔',
    heroTitle: 'گھر کے کام کے لیے',
    heroSub: 'بھروسے مند ہنرمند — قریب، دستیاب، صاف قیمت',
    heroPill: 'آواز سے پہلے · اسلام آباد',
  },
  en: {
    kicker: 'Roshan Rozgar',
    title: 'Good work. Brighter tomorrows.',
    lead: 'Assalam-o-Alaikum — trusted tradespeople for home jobs. Start with your voice, find nearby workers, keep the price clear, and confirm the booking.',
    features: ['Let your voice begin', 'Nearby & available', 'Clear price & trust'],
    workerTitle: "I'm a skilled worker",
    workerDesc: 'Worker — tap the mic, say your name. Typing optional.',
    customerTitle: 'I need a skilled worker',
    customerDesc: 'Customer — find a helping hand nearby, available now.',
    voiceHint:
      'AI understands name, trade, area, and issue from speech — cash on completion, no online payment.',
    demoNote:
      'Demo identities (no real login): Ahmed Khan customer + Ali Raza worker. Auth is simulated for hackathon only.',
    heroTitle: 'For household work',
    heroSub: 'Trusted tradespeople — nearby, available, clear price',
    heroPill: 'Voice-first · Islamabad',
  },
}

export default function WelcomePage() {
  const router = useRouter()
  const { patch } = useSession()
  const [lang, setLang] = useState<Lang>('roman')
  const t = COPY[lang]
  const isUrdu = lang === 'urdu'

  return (
    <div className="landing" lang={isUrdu ? 'ur' : 'en'}>
      <div className="landing-grid">
        <section className={`landing-copy${isUrdu ? ' urdu' : ''}`}>
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
              <Mic2 size={18} color="#0b7a4b" /> {t.features[0]}
            </div>
            <div className="feature-chip">
              <MapPin size={18} color="#0b7a4b" /> {t.features[1]}
            </div>
            <div className="feature-chip">
              <Sparkles size={18} color="#0b7a4b" /> {t.features[2]}
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
