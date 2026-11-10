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

const apiKey = env.GEMINI_API_KEY
if (!apiKey) {
  console.error('NO_KEY')
  process.exit(1)
}

const textModel = env.GEMINI_MODEL || 'gemini-3.8-flash'
const liveModel = env.GEMINI_LIVE_MODEL || 'gemini-3.8-live'

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ])
}

const ai = new GoogleGenAI({ apiKey })
try {
  const r = await withTimeout(
    ai.models.generateContent({
      model: textModel,
      contents: 'Reply with JSON {"ok":true}',
      config: { responseMimeType: 'application/json' },
    }),
    20000,
    'TEXT',
  )
  console.log('TEXT_OK', r.text)
} catch (e) {
  console.error('TEXT_FAIL', String(e.message || e).slice(0, 400))
}

try {
  const a = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1alpha' } })
  const t = await withTimeout(
    a.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60e3).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 120e3).toISOString(),
        liveConnectConstraints: {
          model: liveModel,
          config: { responseModalities: ['AUDIO'] },
        },
      },
    }),
    20000,
    'TOKEN',
  )
  console.log('TOKEN_OK', Boolean(t.name))
} catch (e) {
  console.error('TOKEN_FAIL', String(e.message || e).slice(0, 400))
}
