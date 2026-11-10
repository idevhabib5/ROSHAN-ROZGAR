import { z } from 'zod'
import { prisma } from '@/lib/db'
import { handleRouteError, jsonError, jsonOk } from '@/lib/api'

const createSchema = z.object({
  requestId: z.string().min(1),
  workerId: z.string().min(1),
  amountPkr: z.number().int().min(100).max(500000),
})

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json())
    const request = await prisma.serviceRequest.findUnique({ where: { id: body.requestId } })
    if (!request) return jsonError('Request not found', 404)
    if (['booked', 'cancelled'].includes(request.status)) {
      return jsonError('Request is no longer open for quotes', 400)
    }

    const quote = await prisma.quote.create({
      data: {
        requestId: body.requestId,
        workerId: body.workerId,
        amountPkr: body.amountPkr,
        state: 'proposed',
      },
    })

    await prisma.serviceRequest.update({
      where: { id: body.requestId },
      data: { status: 'quoted' },
    })

    return jsonOk(quote, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
