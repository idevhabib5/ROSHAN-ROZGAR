'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleGenAI, Modality } from '@google/genai'

type Mode = 'customer' | 'worker' | 'customerProfile'

function floatTo16BitPCM(input: Float32Array) {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

function downsampleTo16k(buffer: Float32Array, sampleRate: number) {
  if (sampleRate === 16000) return buffer
  const ratio = sampleRate / 16000
  const newLen = Math.round(buffer.length / ratio)
  const result = new Float32Array(newLen)
  for (let i = 0; i < newLen; i++) {
    const start = Math.floor(i * ratio)
    result[i] = buffer[start] ?? 0
  }
  return result
}

function pcm16ToBase64(pcm: Int16Array) {
  const bytes = new Uint8Array(pcm.buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

function base64ToInt16(b64: string) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Int16Array(bytes.buffer)
}

export function useGeminiSpeech(
  mode: Mode = 'customer',
  options?: { onSpeechComplete?: (transcript: string) => void },
) {
  const [supported, setSupported] = useState(false)
  const [geminiReady, setGeminiReady] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [assistantReply, setAssistantReply] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [transport, setTransport] = useState<'live' | 'turn' | 'browser' | null>(null)

  const sessionRef = useRef<{ close: () => void } | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const nextPlayTimeRef = useRef(0)
  const transcriptRef = useRef('')
  const onCompleteRef = useRef(options?.onSpeechComplete)
  const transportRef = useRef(transport)
  onCompleteRef.current = options?.onSpeechComplete
  transportRef.current = transport

  useEffect(() => {
    setSupported(typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia)
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((d) => setGeminiReady(Boolean(d.gemini)))
      .catch(() => setGeminiReady(false))
  }, [])

  const stopAudioGraph = useCallback(() => {
    processorRef.current?.disconnect()
    processorRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      void audioCtxRef.current.close()
    }
    audioCtxRef.current = null
    nextPlayTimeRef.current = 0
  }, [])

  const playPcm16kBase64 = useCallback(async (b64: string) => {
    const ctx = audioCtxRef.current || new AudioContext({ sampleRate: 24000 })
    audioCtxRef.current = ctx
    if (ctx.state === 'suspended') await ctx.resume()
    const pcm = base64ToInt16(b64)
    const float = new Float32Array(pcm.length)
    for (let i = 0; i < pcm.length; i++) float[i] = (pcm[i] || 0) / 32768
    const buffer = ctx.createBuffer(1, float.length, 24000)
    buffer.copyToChannel(float, 0)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.connect(ctx.destination)
    const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current)
    src.start(startAt)
    nextPlayTimeRef.current = startAt + buffer.duration
    setSpeaking(true)
    src.onended = () => {
      if (nextPlayTimeRef.current <= ctx.currentTime + 0.05) setSpeaking(false)
    }
  }, [])

  const speakBrowser = useCallback((text: string) => {
    if (!window.speechSynthesis || !text) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-PK'
    u.rate = 0.95
    u.onstart = () => setSpeaking(true)
    u.onend = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }, [])

  const stop = useCallback(() => {
    const wasLive = transportRef.current === 'live'
    const hadRecorder =
      mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive'
    try {
      sessionRef.current?.close()
    } catch {
      /* ignore */
    }
    sessionRef.current = null
    if (hadRecorder) {
      mediaRecorderRef.current?.stop()
    }
    mediaRecorderRef.current = null
    stopAudioGraph()
    setListening(false)
    // Live sessions finalize immediately; turn-based fires from recorder.onstop.
    if (wasLive && !hadRecorder) {
      const text = transcriptRef.current.trim()
      if (text) onCompleteRef.current?.(text)
    }
  }, [stopAudioGraph])

  const startTurnBased = useCallback(async () => {
    setTransport('turn')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream
    const recorder = new MediaRecorder(stream)
    chunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = async () => {
      try {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const buf = await blob.arrayBuffer()
        const bytes = new Uint8Array(buf)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
        const audioBase64 = btoa(binary)
        const res = await fetch('/api/ai/speech-turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64,
            mimeType: blob.type || 'audio/webm',
            mode,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Speech turn failed')
        const text = String(data.transcript || '').trim()
        setTranscript(text)
        transcriptRef.current = text
        setAssistantReply(data.reply || '')
        if (text) onCompleteRef.current?.(text)
        else speakBrowser(data.reply || 'Dobara boliye, please.')
      } catch (e) {
        setError((e as Error).message)
      } finally {
        stopAudioGraph()
        setListening(false)
      }
    }
    mediaRecorderRef.current = recorder
    recorder.start()
    setListening(true)
  }, [mode, speakBrowser, stopAudioGraph])

  const startLive = useCallback(async () => {
    const tokenRes = await fetch('/api/ai/live-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.token) {
      throw new Error(tokenData.detail || tokenData.error || 'Live token failed')
    }

    setTransport('live')
    const ai = new GoogleGenAI({
      apiKey: tokenData.token,
      httpOptions: { apiVersion: 'v1alpha' },
    })

    const session = await ai.live.connect({
      model: tokenData.model,
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => undefined,
        onmessage: (msg) => {
          const inputTx =
            msg.serverContent?.inputTranscription?.text ||
            (msg as { inputTranscription?: { text?: string } }).inputTranscription?.text
          if (inputTx) {
            const next = `${transcriptRef.current} ${inputTx}`.trim()
            transcriptRef.current = next
            setTranscript(next)
          }
          const outputTx =
            msg.serverContent?.outputTranscription?.text ||
            (msg as { outputTranscription?: { text?: string } }).outputTranscription?.text
          if (outputTx) {
            setAssistantReply((prev) => `${prev} ${outputTx}`.trim())
          }
          const parts = msg.serverContent?.modelTurn?.parts || []
          for (const part of parts) {
            const inline = part.inlineData
            if (inline?.data && inline.mimeType?.includes('audio')) {
              void playPcm16kBase64(inline.data)
            }
          }
        },
        onerror: (e) => {
          setError(e.message || 'Live session error')
          setListening(false)
        },
        onclose: () => {
          setListening(false)
        },
      },
    })
    sessionRef.current = session

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    })
    streamRef.current = stream
    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const source = ctx.createMediaStreamSource(stream)
    const processor = ctx.createScriptProcessor(4096, 1, 1)
    processorRef.current = processor
    processor.onaudioprocess = (ev) => {
      const input = ev.inputBuffer.getChannelData(0)
      const down = downsampleTo16k(input, ctx.sampleRate)
      const pcm = floatTo16BitPCM(down)
      try {
        session.sendRealtimeInput({
          audio: {
            data: pcm16ToBase64(pcm),
            mimeType: 'audio/pcm;rate=16000',
          },
        })
      } catch {
        /* session may be closing */
      }
    }
    source.connect(processor)
    processor.connect(ctx.destination)
    setListening(true)
  }, [mode, playPcm16kBase64])

  const start = useCallback(async () => {
    setError(null)
    setAssistantReply('')
    setTranscript('')
    transcriptRef.current = ''
    stop()

    if (!supported) {
      setError('Microphone is not available in this browser.')
      return false
    }

    if (!geminiReady) {
      setError('Roshan Assistant is not configured on the server.')
      return false
    }

    try {
      await startLive()
      return true
    } catch {
      try {
        await startTurnBased()
        return true
      } catch (e) {
        setError((e as Error).message || 'Could not start Roshan Assistant speech')
        setListening(false)
        return false
      }
    }
  }, [geminiReady, startLive, startTurnBased, stop, supported])

  const speak = useCallback(
    (text: string) => {
      speakBrowser(text)
    },
    [speakBrowser],
  )

  return {
    supported: supported && geminiReady,
    micSupported: supported,
    geminiReady,
    listening,
    speaking,
    transcript,
    setTranscript,
    assistantReply,
    error,
    transport,
    start,
    stop,
    speak,
  }
}
