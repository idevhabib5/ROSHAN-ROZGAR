import { NextResponse } from 'next/server'
import { geminiConfigured, geminiLiveModel, geminiTextModel } from '@/lib/ai/gemini'

export async function GET() {
  return NextResponse.json({
    gemini: geminiConfigured(),
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    textModel: geminiConfigured() ? geminiTextModel() : null,
    liveModel: geminiConfigured() ? geminiLiveModel() : null,
  })
}
