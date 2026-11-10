'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from '@/components/SessionProvider'

export function useRealtime(onEvent?: (event: string, payload: unknown) => void) {
  const { session, ready } = useSession()
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    if (!ready || !session.role) return

    const socket = io({
      path: '/api/socketio',
      auth: {
        role: session.role,
        workerId: session.workerId,
        customerId: session.customerId,
      },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    const events = [
      'job:new_request',
      'job:request_expired',
      'job:request_cancelled',
      'offer:accepted',
      'offer:not_selected',
      'dispatch:started',
      'dispatch:radius_expanded',
      'dispatch:no_workers',
      'offer:received',
      'offer:updated',
      'offer:withdrawn',
      'booking:confirmed',
    ]

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    for (const ev of events) {
      socket.on(ev, (payload) => handlerRef.current?.(ev, payload))
    }

    return () => {
      for (const ev of events) socket.off(ev)
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [ready, session.role, session.workerId, session.customerId])

  return { connected, socket: socketRef.current }
}

/** Polling fallback when socket is down */
export function usePolling(fetcher: () => void | Promise<void>, intervalMs = 2500, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const run = async () => {
      if (cancelled) return
      try {
        await fetcher()
      } catch {
        /* ignore transient poll errors */
      }
    }
    run()
    const id = setInterval(run, intervalMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [fetcher, intervalMs, enabled])
}
