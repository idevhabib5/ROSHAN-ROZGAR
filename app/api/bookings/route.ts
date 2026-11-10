import { prisma } from '@/lib/db'
import { handleRouteError, jsonOk } from '@/lib/api'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const workerId = searchParams.get('workerId') || undefined
    const customerId = searchParams.get('customerId') || undefined
    const status = searchParams.get('status') || undefined

    const bookings = await prisma.booking.findMany({
      where: {
        ...(workerId ? { workerId } : {}),
        ...(customerId ? { customerId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        worker: true,
        customer: true,
        request: true,
        review: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return jsonOk({ bookings })
  } catch (err) {
    return handleRouteError(err)
  }
}
