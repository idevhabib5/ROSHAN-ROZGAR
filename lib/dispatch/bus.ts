type Handler = (event: string, payload: unknown) => void

/** In-process event bus so API routes can notify Socket.IO without circular imports */
const handlers = new Set<Handler>()

export function onDispatchEvent(handler: Handler) {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

export function emitDispatchEvent(event: string, payload: unknown) {
  for (const h of handlers) {
    try {
      h(event, payload)
    } catch (err) {
      console.error('dispatch bus handler error', err)
    }
  }

  const g = globalThis as unknown as {
    __rr_emit?: (event: string, payload: unknown) => void
  }
  if (typeof g.__rr_emit === 'function') {
    try {
      g.__rr_emit(event, payload)
    } catch (err) {
      console.error('socket emit bridge error', err)
    }
  }
}
