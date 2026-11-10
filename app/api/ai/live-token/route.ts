import { NextResponse } from 'next/server'
import { Modality } from '@google/genai'
import { geminiClient, geminiConfigured, geminiLiveModel } from '@/lib/ai/gemini'

const CUSTOMER_SYSTEM = `You are Roshan Rozgar voice assistant for customers in Islamabad.
Help them describe a home service need (plumber, electrician, AC technician, carpenter).
Ask briefly for trade, area, urgency, and issue. Keep replies short and spoken-friendly.
Roman Urdu or English is fine. No payments online — cash on completion.`

const WORKER_SYSTEM = `You are Roshan Rozgar voice assistant for worker onboarding in Islamabad.
Collect name, trade, years of experience, service area, and typical visit charge.
Keep replies short and spoken-friendly. Roman Urdu or English is fine.`

export async function POST(req: Request) {
  if (!geminiConfigured()) {
    return NextResponse.json({ error: 'Gemini is not configured' }, { status: 503 })
  }

  const body = (await req.json().catch(() => ({}))) as { mode?: string }
  const mode = body.mode === 'worker' ? 'worker' : 'customer'
  const model = geminiLiveModel()
  const systemInstruction = mode === 'worker' ? WORKER_SYSTEM : CUSTOMER_SYSTEM

  try {
    const ai = geminiClient('v1alpha')
    if (!ai) {
      return NextResponse.json({ error: 'Gemini is not configured' }, { status: 503 })
    }

    const expireTime = new Date(Date.now() + 30 * 60_000).toISOString()
    const newSessionExpireTime = new Date(Date.now() + 2 * 60_000).toISOString()

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        httpOptions: { apiVersion: 'v1alpha' },
        liveConnectConstraints: {
          model,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction,
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        },
      },
    })

    if (!token.name) {
      return NextResponse.json({ error: 'Could not mint live token' }, { status: 502 })
    }

    return NextResponse.json(
      { token: token.name, model, mode, transport: 'live' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    return NextResponse.json(
      {
        error: 'Live token unavailable',
        detail: (e as Error).message,
        fallback: 'turn',
        model,
        mode,
      },
      { status: 502 },
    )
  }
}
