import { NextResponse } from 'next/server'
import { geminiConfigured, geminiTranscribeAudio } from '@/lib/ai/gemini'

export async function POST(req: Request) {
  if (!geminiConfigured()) {
    return NextResponse.json({ error: 'Gemini is not configured' }, { status: 503 })
  }

  const body = (await req.json().catch(() => null)) as {
    audioBase64?: string
    mimeType?: string
    mode?: 'customer' | 'worker'
  } | null

  if (!body?.audioBase64) {
    return NextResponse.json({ error: 'audioBase64 required' }, { status: 400 })
  }

  const hint =
    body.mode === 'worker'
      ? 'Transcribe worker onboarding speech (Roman Urdu/Urdu/English). Return JSON {"transcript":"...","reply":"short confirmation asking only for missing name/trade/experience/area/charge"}.'
      : 'Transcribe customer home-service request speech (Roman Urdu/Urdu/English). Return JSON {"transcript":"...","reply":"short confirmation of trade, area, and issue"}.'

  const result = await geminiTranscribeAudio({
    base64: body.audioBase64,
    mimeType: body.mimeType || 'audio/webm',
    hint,
  })

  if (!result) {
    return NextResponse.json({ error: 'Could not understand audio' }, { status: 502 })
  }

  return NextResponse.json({
    transcript: result.transcript,
    reply: result.reply,
    provider: 'gemini',
    transport: 'turn',
  })
}
