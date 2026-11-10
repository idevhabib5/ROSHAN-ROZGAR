import { z } from 'zod'
import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import { prisma } from '@/lib/db'
import { getStripe, stripeConfigured } from '@/lib/stripe'

const bodySchema = z.object({
  sessionId: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    if (!stripeConfigured()) {
      return jsonError('Stripe is not configured', 503, { code: 'STRIPE_NOT_CONFIGURED' })
    }

    const body = bodySchema.parse(await req.json())
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(body.sessionId)

    const bookingId = session.metadata?.bookingId
    if (!bookingId) return jsonError('Payment session is missing booking metadata', 400)

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        worker: true,
        customer: true,
        request: true,
        acceptedQuote: true,
      },
    })
    if (!booking) return jsonError('Booking not found', 404)

    if (session.payment_status === 'paid' || session.status === 'complete') {
      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || null

      const updated =
        booking.paymentStatus === 'paid'
          ? booking
          : await prisma.booking.update({
              where: { id: booking.id },
              data: {
                paymentStatus: 'paid',
                paymentMethod: 'stripe',
                stripeCheckoutSessionId: session.id,
                stripePaymentIntentId: paymentIntentId,
                paidAt: new Date(),
              },
              include: {
                worker: true,
                customer: true,
                request: true,
                acceptedQuote: true,
              },
            })

      return jsonOk({
        paid: true,
        booking: updated,
        reference: `RR-${updated.id.slice(-6).toUpperCase()}`,
        amountPkr: updated.agreedAmountPkr,
        stripeSessionId: session.id,
      })
    }

    return jsonOk({
      paid: false,
      booking,
      paymentStatus: session.payment_status,
      reference: `RR-${booking.id.slice(-6).toUpperCase()}`,
      amountPkr: booking.agreedAmountPkr,
      stripeSessionId: session.id,
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
