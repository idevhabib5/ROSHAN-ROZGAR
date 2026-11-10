import { z } from 'zod'
import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import { prisma } from '@/lib/db'
import { amountToStripeMinorUnits, appBaseUrl, getStripe, stripeConfigured } from '@/lib/stripe'

const bodySchema = z.object({
  bookingId: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    if (!stripeConfigured()) {
      return jsonError(
        'Stripe is not fully configured. Add STRIPE_SECRET_KEY to .env (matching your publishable key).',
        503,
        { code: 'STRIPE_NOT_CONFIGURED' },
      )
    }

    const body = bodySchema.parse(await req.json())
    const booking = await prisma.booking.findUnique({
      where: { id: body.bookingId },
      include: {
        worker: true,
        request: true,
        customer: true,
      },
    })
    if (!booking) return jsonError('Booking not found', 404)
    if (booking.paymentStatus === 'paid') {
      return jsonError('This booking is already paid', 400, { code: 'ALREADY_PAID' })
    }

    const stripe = getStripe()
    const base = appBaseUrl(req)
    const currency = (process.env.STRIPE_CURRENCY || 'pkr').toLowerCase()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amountToStripeMinorUnits(booking.agreedAmountPkr),
            product_data: {
              name: `Roshan Rozgar · ${booking.request.trade}`,
              description: [
                booking.worker.displayName,
                booking.request.title || booking.request.issueDescription.slice(0, 80),
                booking.request.location,
              ]
                .filter(Boolean)
                .join(' · '),
            },
          },
        },
      ],
      metadata: {
        bookingId: booking.id,
        requestId: booking.requestId,
        workerId: booking.workerId,
        customerId: booking.customerId,
      },
      success_url: `${base}/customer/payment/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/customer/payment?bookingId=${booking.id}&canceled=1`,
    })

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        stripeCheckoutSessionId: session.id,
      },
    })

    return jsonOk({
      sessionId: session.id,
      url: session.url,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null,
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
