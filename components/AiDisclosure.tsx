'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

export function AiDisclosure({
  mode = 'inline',
}: {
  mode?: 'inline' | 'banner'
}) {
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'heuristic' | 'unknown'>('unknown')

  useEffect(() => {
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((d) => {
        if (d.gemini) setProvider('gemini')
        else if (d.openai) setProvider('openai')
        else setProvider('heuristic')
      })
      .catch(() => setProvider('heuristic'))
  }, [])

  const label =
    provider === 'gemini'
      ? 'Roshan Assistant (speech + field extraction). If voice fails, type or use sample text.'
      : provider === 'openai'
        ? 'Roshan Assistant via OpenAI extraction. If AI fails, type or use sample text.'
        : provider === 'heuristic'
          ? 'Roshan Assistant offline: using local keyword parsing. Add GEMINI_API_KEY for full voice.'
          : 'Checking Roshan Assistant status…'

  if (mode === 'banner') {
    return (
      <p className="status-note" role="note" style={{ marginBottom: 12 }}>
        <Sparkles size={14} style={{ display: 'inline', marginRight: 6 }} aria-hidden />
        {label}
      </p>
    )
  }

  return (
    <p className="field-hint" role="note">
      <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} aria-hidden />
      {label}
    </p>
  )
}
