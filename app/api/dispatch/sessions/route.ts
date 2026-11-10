import { z } from 'zod'
import { handleRouteError, jsonOk } from '@/lib/api'
import { startDispatchSession } from '@/lib/dispatch/session'
import { parseDemoHeaders } from '@/lib/session'
import { prisma } from '@/lib/db'
import { jsonError } from '@/lib/api'

const bodySchema = z.object({
  requestId: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json())
    const { customerId } = parseDemoHeaders(req.headers)
    const request = await prisma.serviceRequest.findUnique({ where: { id: body.requestId } })
    if (!request) return jsonError('Request not found', 404)
    if (request.customerId !== customerId) return jsonError('Forbidden', 403)

    const status = await startDispatchSession(body.requestId)
    return jsonOk(status, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
