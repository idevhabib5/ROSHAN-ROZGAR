import { prisma } from '@/lib/db'
import { handleRouteError, jsonError, jsonOk } from '@/lib/api'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const quote = await prisma.quote.findUnique({ where: { id } })
    if (!quote) return jsonError('Quote not found', 404)
    if (quote.state === 'accepted') return jsonOk(quote)

    const updated = await prisma.$transaction(async (tx) => {
      await tx.quote.updateMany({
        where: {
          requestId: quote.requestId,
          id: { not: id },
          state: 'proposed',
        },
        data: { state: 'rejected' },
      })
      const q = await tx.quote.update({
        where: { id },
        data: { state: 'accepted' },
      })
      await tx.serviceRequest.update({
        where: { id: quote.requestId },
        data: { status: 'price_agreed' },
      })
      return q
    })

    return jsonOk(updated)
  } catch (err) {
    return handleRouteError(err)
  }
}
