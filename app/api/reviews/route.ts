import { z } from 'zod'
import { prisma } from '@/lib/db'
import { handleRouteError, jsonError, jsonOk } from '@/lib/api'

const createSchema = z.object({
  bookingId: z.string().min(1),
  customerId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().nullable(),
})

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json())
    const booking = await prisma.booking.findUnique({ where: { id: body.bookingId } })
    if (!booking) return jsonError('Booking not found', 404)
    if (booking.status !== 'completed') {
      return jsonError('Review only allowed after completion', 400, { code: 'NOT_COMPLETED' })
    }
    if (booking.customerId !== body.customerId) {
      return jsonError('Only the booking customer can review', 403)
    }

    const existing = await prisma.review.findUnique({ where: { bookingId: body.bookingId } })
    if (existing) {
      return jsonError('Review already exists for this booking', 409, { code: 'DUPLICATE_REVIEW' })
    }

    const review = await prisma.review.create({
      data: {
        bookingId: body.bookingId,
        workerId: booking.workerId,
        customerId: body.customerId,
        rating: body.rating,
        comment: body.comment || null,
        isDemoSeed: false,
      },
    })

    return jsonOk(review, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
