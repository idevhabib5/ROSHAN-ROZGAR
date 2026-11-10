import { z } from 'zod'
import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import { prisma } from '@/lib/db'

const bodySchema = z.object({
  bookingId: z.string().min(1),
})

/** Mark booking as cash-on-completion (skip Stripe). */
export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json())
    const booking = await prisma.booking.findUnique({ where: { id: body.bookingId } })
    if (!booking) return jsonError('Booking not found', 404)
    if (booking.paymentStatus === 'paid') {
      return jsonError('Already paid online', 400, { code: 'ALREADY_PAID' })
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: 'cash',
        paymentMethod: 'cash',
      },
      include: {
        worker: true,
        request: true,
        customer: true,
      },
    })

    return jsonOk(updated)
  } catch (err) {
    return handleRouteError(err)
  }
}
