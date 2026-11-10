import { z } from 'zod'
import { confirmBooking } from '@/lib/booking'
import { handleRouteError, jsonOk } from '@/lib/api'
import { prisma } from '@/lib/db'

const bodySchema = z.object({
  requestId: z.string().min(1),
  workerId: z.string().min(1),
  customerId: z.string().min(1),
  quoteId: z.string().min(1),
  scheduledTime: z.string().min(1).max(120),
})

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json())
    const booking = await confirmBooking(body)
    const full = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        worker: true,
        customer: true,
        request: true,
        acceptedQuote: true,
      },
    })
    return jsonOk(full, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
