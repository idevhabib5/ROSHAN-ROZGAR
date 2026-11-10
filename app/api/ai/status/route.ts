import { NextResponse } from 'next/server'
import { geminiConfigured, geminiLiveModel, geminiTextModel } from '@/lib/ai/gemini'

export async function GET() {
  return NextResponse.json({
    gemini: geminiConfigured(),
    textModel: geminiConfigured() ? geminiTextModel() : null,
    liveModel: geminiConfigured() ? geminiLiveModel() : null,
  })
}
