import { z } from 'zod'
import { prisma } from '@/lib/db'
import { handleRouteError, jsonError, jsonOk } from '@/lib/api'

const ALLOWED: Record<string, string[]> = {
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

const bodySchema = z.object({
  status: z.enum(['confirmed', 'in_progress', 'completed', 'cancelled']),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = bodySchema.parse(await req.json())
    const booking = await prisma.booking.findUnique({ where: { id } })
    if (!booking) return jsonError('Booking not found', 404)

    const allowed = ALLOWED[booking.status] || []
    if (!allowed.includes(body.status)) {
      return jsonError(`Cannot transition from ${booking.status} to ${body.status}`, 400)
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: body.status },
      include: { worker: true, customer: true, request: true },
    })

    return jsonOk(updated)
  } catch (err) {
    return handleRouteError(err)
  }
}
