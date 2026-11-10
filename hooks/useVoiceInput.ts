'use client'

import { useCallback, useEffect, useState } from 'react'
import { useGeminiSpeech } from '@/hooks/useGeminiSpeech'
import { useSpeech } from '@/hooks/useSpeech'

type Mode = 'customer' | 'worker'

/** Prefer Gemini speech-to-speech; fall back to browser Web Speech. */
export function useVoiceInput(mode: Mode = 'customer') {
  const gemini = useGeminiSpeech(mode)
  const browser = useSpeech()
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
    providerLabel: usingGemini ? 'Gemini' : 'Browser',
    start,
    stop,
    speak: usingGemini ? gemini.speak : browser.speak,
  }
}
