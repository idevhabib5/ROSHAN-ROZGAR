'use client'

import { useCallback, useRef, useState } from 'react'

/** Record a short browser voice note as a data URL for demo chat (FR-07). */
export function useVoiceNote() {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const stop = useCallback(async () => {
    const rec = recorderRef.current
    if (!rec || rec.state === 'inactive') {
      setRecording(false)
      return null as string | null
    }
    return new Promise<string | null>((resolve) => {
      rec.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
          if (blob.size < 200) {
            setError('Recording was too short. Hold the mic and speak again.')
            resolve(null)
            return
          }
          if (blob.size > 900_000) {
            setError('Voice note is too long for this demo. Keep it under ~30 seconds.')
            resolve(null)
            return
          }
          const buf = await blob.arrayBuffer()
          const bytes = new Uint8Array(buf)
          let binary = ''
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
          const dataUrl = `data:${blob.type || 'audio/webm'};base64,${btoa(binary)}`
          resolve(dataUrl)
        } catch {
          setError('Could not save the voice note.')
          resolve(null)
        } finally {
          stopTracks()
          setRecording(false)
          recorderRef.current = null
        }
      }
      rec.stop()
    })
  }, [])

  const start = useCallback(async () => {
    setError(null)
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const rec = new MediaRecorder(stream)
      recorderRef.current = rec
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.start()
      setRecording(true)
    } catch {
      setError('Microphone permission denied. Type a message instead.')
      setRecording(false)
    }
  }, [])

  return { recording, error, start, stop, setError }
}
