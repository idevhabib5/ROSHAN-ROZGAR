'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null
  onerror: ((ev: { error: string }) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
    SpeechRecognition?: new () => SpeechRecognitionLike
  }
}

export function useSpeech(options?: { onSpeechComplete?: (transcript: string) => void }) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const transcriptRef = useRef('')
  const completedRef = useRef(false)
  const onCompleteRef = useRef(options?.onSpeechComplete)
  onCompleteRef.current = options?.onSpeechComplete

  const finishOnce = useCallback(() => {
    if (completedRef.current) return
    const text = transcriptRef.current.trim()
    if (!text) return
    completedRef.current = true
    onCompleteRef.current?.(text)
  }, [])

  useEffect(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    setSupported(Boolean(Ctor))
  }, [])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setListening(false)
    finishOnce()
  }, [finishOnce])

  const start = useCallback(() => {
    setError(null)
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Ctor) {
      setError('Speech recognition is not supported in this browser. Use the text fallback.')
      return
    }
    const rec = new Ctor()
    rec.lang = 'en-PK'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (ev) => {
      const parts: string[] = []
      for (let i = 0; i < ev.results.length; i++) {
        parts.push(ev.results[i][0].transcript)
      }
      const text = parts.join(' ').trim()
      transcriptRef.current = text
      setTranscript(text)
    }
    rec.onerror = (ev) => {
      setError(ev.error === 'not-allowed' ? 'Microphone permission denied.' : `Speech error: ${ev.error}`)
      setListening(false)
    }
    rec.onend = () => {
      setListening(false)
      finishOnce()
    }
    recRef.current = rec
    transcriptRef.current = ''
    completedRef.current = false
    setTranscript('')
    rec.start()
    setListening(true)
  }, [finishOnce])

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-PK'
    u.rate = 0.95
    window.speechSynthesis.speak(u)
  }, [])

  return { supported, listening, transcript, setTranscript, error, start, stop, speak }
}
