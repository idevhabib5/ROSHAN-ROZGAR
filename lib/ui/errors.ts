/** Map technical/API errors to short actionable copy (heuristic evaluation). */
export function friendlyError(raw: unknown, fallback = 'Something went wrong. Try again.') {
  const message = raw instanceof Error ? raw.message : String(raw || '')
  const m = message.toLowerCase()

  if (!message.trim()) return fallback
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('offline')) {
    return 'Connection problem. Check your internet and try again.'
  }
  if (m.includes('timeout') || m.includes('aborted')) {
    return 'Request timed out. Please try again.'
  }
  if (m.includes('unauthorized') || m.includes('401')) {
    return 'Please log in again, then continue.'
  }
  if (m.includes('already') && m.includes('offer')) {
    return 'You already sent an offer for this job.'
  }
  if (m.includes('expired')) {
    return 'This offer or request has expired. Start a new search.'
  }
  if (m.includes('engaged') || m.includes('unavailable')) {
    return 'That worker is not available right now. Choose another offer.'
  }
  if (m.includes('cancel')) {
    return 'Could not cancel the request. Refresh and try again.'
  }
  if (/^\d{3}\b/.test(message) || m.includes('internal server')) {
    return 'We could not complete that action. Please try again in a moment.'
  }
  return message.length > 140 ? fallback : message
}
