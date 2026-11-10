import { handleRouteError, jsonOk } from '@/lib/api'
import { acceptOffer } from '@/lib/dispatch/offers'
import { parseDemoHeaders } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { customerId } = parseDemoHeaders(_req.headers)
    const result = await acceptOffer(id, customerId)
    const full = await prisma.booking.findUnique({
      where: { id: result.booking.id },
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
