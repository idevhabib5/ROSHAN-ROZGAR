import Stripe from 'stripe'

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

export function stripePublishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || ''
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) {
    throw Object.assign(new Error('Stripe secret key is not configured'), {
      status: 503,
      code: 'STRIPE_NOT_CONFIGURED',
    })
  }
  return new Stripe(key)
}

/** PKR uses two decimal places in Stripe (paisa). */
export function amountToStripeMinorUnits(amountPkr: number) {
  return Math.round(amountPkr * 100)
}

export function appBaseUrl(req?: Request) {
  const fromEnv = process.env.AUTH_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (req) {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
    const proto = req.headers.get('x-forwarded-proto') || 'http'
    if (host) return `${proto}://${host}`
  }
  return 'http://localhost:3000'
}
