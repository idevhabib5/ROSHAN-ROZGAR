'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useGeminiSpeech } from '@/hooks/useGeminiSpeech'
import { useSpeech } from '@/hooks/useSpeech'

type Mode = 'customer' | 'worker' | 'customerProfile'

/** Prefer Roshan Assistant (Gemini) speech; fall back to browser Web Speech. */
export function useVoiceInput(
  mode: Mode = 'customer',
  options?: { onSpeechComplete?: (transcript: string) => void },
) {
  const onCompleteRef = useRef(options?.onSpeechComplete)
  const lastCompleteRef = useRef({ text: '', at: 0 })
  onCompleteRef.current = options?.onSpeechComplete

  const handleComplete = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const now = Date.now()
    if (
      lastCompleteRef.current.text === trimmed &&
      now - lastCompleteRef.current.at < 1500
    ) {
      return
    }
    lastCompleteRef.current = { text: trimmed, at: now }
    onCompleteRef.current?.(trimmed)
  }, [])

  const gemini = useGeminiSpeech(mode, { onSpeechComplete: handleComplete })
  const browser = useSpeech({ onSpeechComplete: handleComplete })
  const [preferGemini, setPreferGemini] = useState(true)

  useEffect(() => {
    if (gemini.geminiReady) setPreferGemini(true)
  }, [gemini.geminiReady])

  const usingGemini = preferGemini && gemini.geminiReady

  const start = useCallback(async () => {
    if (usingGemini) {
      const ok = await gemini.start()
      if (ok) return
      if (browser.supported) {
        setPreferGemini(false)
        browser.start()
      }
      return
    }
    browser.start()
  }, [browser, gemini, usingGemini])

  const stop = useCallback(() => {
    gemini.stop()
    browser.stop()
  }, [browser, gemini])

  const setTranscript = usingGemini ? gemini.setTranscript : browser.setTranscript

  return {
    supported: gemini.micSupported || browser.supported,
    listening: gemini.listening || browser.listening,
    speaking: gemini.speaking,
    transcript: usingGemini ? gemini.transcript || browser.transcript : browser.transcript,
    setTranscript,
    assistantReply: gemini.assistantReply,
    error: gemini.error || browser.error,
    transport: gemini.transport || (!preferGemini ? ('browser' as const) : null),
    providerLabel: usingGemini ? 'Roshan Assistant' : 'Browser',
    start,
    stop,
    speak: usingGemini ? gemini.speak : browser.speak,
  }
}
