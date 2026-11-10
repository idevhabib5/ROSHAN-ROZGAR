import fs from 'fs'
import { GoogleGenAI } from '@google/genai'

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1)]
    }),
)

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
const model = env.GEMINI_MODEL || 'gemini-3.8-flash'

try {
  const r = await ai.models.generateContent({
    model,
    contents: 'Return JSON {"ok":true} only.',
    config: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: 'low' },
    },
  })
  console.log('OK', r.text)
} catch (e) {
  console.error('FAIL', String(e.message || e).slice(0, 500))
  process.exitCode = 1
}
