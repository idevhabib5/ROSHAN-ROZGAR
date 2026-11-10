import { prisma } from '@/lib/db'
import { handleRouteError, jsonError, jsonOk } from '@/lib/api'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        worker: true,
        customer: true,
        request: true,
        acceptedQuote: true,
        review: true,
      },
    })
    if (!booking) return jsonError('Booking not found', 404)
    return jsonOk(booking)
  } catch (err) {
    return handleRouteError(err)
  }
}
