import { GoogleGenAI, ThinkingLevel } from '@google/genai'

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim())
}

export function geminiClient(apiVersion?: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) return null
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { httpOptions: { apiVersion } } : {}),
  })
}

export function geminiTextModel() {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash'
}

export function geminiLiveModel() {
  return process.env.GEMINI_LIVE_MODEL?.trim() || 'gemini-3.8-live'
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms)
    promise
      .then((v) => {
        clearTimeout(t)
        resolve(v)
      })
      .catch(() => {
        clearTimeout(t)
        resolve(null)
      })
  })
}

export async function geminiJson<T>(system: string, user: string): Promise<T | null> {
  const ai = geminiClient()
  if (!ai) return null
  try {
    const res = await withTimeout(
      ai.models.generateContent({
        model: geminiTextModel(),
        contents: user,
        config: {
          systemInstruction: system,
          temperature: 0,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }),
      Number(process.env.GEMINI_TIMEOUT_MS || 8000),
    )
    if (!res) return null
    const text = res.text?.trim()
    if (!text) return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export async function geminiTranscribeAudio(args: {
  base64: string
  mimeType: string
  hint?: string
}): Promise<{ transcript: string; reply: string } | null> {
  const ai = geminiClient()
  if (!ai) return null
  try {
    const res = await ai.models.generateContent({
      model: geminiTextModel(),
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: args.mimeType || 'audio/webm',
                data: args.base64,
              },
            },
            {
              text:
                args.hint ||
                'Transcribe this home-services voice note (Roman Urdu, Urdu, or English). Return JSON: {"transcript":"...","reply":"short spoken confirmation in the same language"}. Do not invent missing facts.',
            },
          ],
        },
      ],
      config: {
        temperature: 0,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    })
    const text = res.text?.trim()
    if (!text) return null
    const parsed = JSON.parse(text) as { transcript?: string; reply?: string }
    if (!parsed.transcript?.trim()) return null
    return {
      transcript: parsed.transcript.trim(),
      reply: (parsed.reply || 'Samajh gaya.').trim(),
    }
  } catch {
    return null
  }
}
