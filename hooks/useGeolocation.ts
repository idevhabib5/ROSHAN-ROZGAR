'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/client'
import { friendlyError } from '@/lib/ui/errors'

type Opts = {
  workerId: string
  enabled: boolean
  /** Min ms between location posts */
  throttleMs?: number
}

export function useGeolocation({ workerId, enabled, throttleMs = 15000 }: Opts) {
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>(
    'prompt',
  )
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastPost = useRef(0)

  const send = useCallback(
    async (latitude: number, longitude: number) => {
      const now = Date.now()
      if (now - lastPost.current < throttleMs) return
      lastPost.current = now
      await api(`/api/workers/${workerId}/location`, {
        method: 'POST',
        body: JSON.stringify({ latitude, longitude }),
      })
      setLastSentAt(new Date())
    },
    [workerId, throttleMs],
  )

  const requestAndWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setPermission('unsupported')
      setError('Geolocation not supported in this browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPermission('granted')
        setError(null)
        send(pos.coords.latitude, pos.coords.longitude).catch((e) =>
          setError(friendlyError(e, 'Could not update location.')),
        )
      },
      (err) => {
        setPermission('denied')
        setError(
          err.code === 1
            ? 'Location permission denied. Enable location while available.'
            : friendlyError(err.message, 'Could not read GPS location.'),
        )
      },
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 },
    )
  }, [send])

  useEffect(() => {
    if (!enabled || !workerId) return
    if (!navigator.geolocation) {
      setPermission('unsupported')
      return
    }

    requestAndWatch()
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPermission('granted')
        send(pos.coords.latitude, pos.coords.longitude).catch((e) =>
          setError(friendlyError(e, 'Could not update location.')),
        )
      },
      (err) => {
        setPermission('denied')
        setError(
          err.code === 1
            ? 'Location permission denied. Enable location while available.'
            : friendlyError(err.message, 'Could not read GPS location.'),
        )
      },
      { enableHighAccuracy: false, maximumAge: 20000, timeout: 15000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [enabled, workerId, requestAndWatch, send])

  return { permission, lastSentAt, error, requestAndWatch }
}
