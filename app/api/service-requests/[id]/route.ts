import { prisma } from '@/lib/db'
import { handleRouteError, jsonError, jsonOk } from '@/lib/api'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const request = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        customer: true,
        quotes: { include: { worker: true }, orderBy: { createdAt: 'desc' } },
        messages: { orderBy: { createdAt: 'asc' } },
        bookings: true,
      },
    })
    if (!request) return jsonError('Request not found', 404)
    return jsonOk(request)
  } catch (err) {
    return handleRouteError(err)
  }
}
