import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import {
  cancelDispatch,
  getDispatchStatus,
  startDispatchSession,
} from '@/lib/dispatch/session'
import { parseDemoHeaders } from '@/lib/session'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params
    const { customerId } = parseDemoHeaders(req.headers)
    const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } })
    if (!request) return jsonError('Request not found', 404)
    if (request.customerId !== customerId) return jsonError('Forbidden', 403)

    const status = await getDispatchStatus(requestId)
    if (!status) return jsonError('No dispatch session', 404)
    return jsonOk(status)
  } catch (err) {
    return handleRouteError(err)
  }
}

const patchSchema = z.object({
  action: z.enum(['cancel', 'retry']),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params
    const { customerId } = parseDemoHeaders(req.headers)
    const body = patchSchema.parse(await req.json())

    if (body.action === 'cancel') {
      const result = await cancelDispatch(requestId, customerId)
      return jsonOk(result)
    }

    // retry: reset notifications for a fresh search by deleting session notifications? 
    // Plan: allow retry after no offers — recreate/restart session
    const request = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: { dispatchSession: true },
    })
    if (!request) return jsonError('Request not found', 404)
    if (request.customerId !== customerId) return jsonError('Forbidden', 403)

    if (request.dispatchSession) {
      await prisma.dispatchNotification.deleteMany({
        where: { sessionId: request.dispatchSession.id },
      })
      await prisma.dispatchSession.update({
        where: { id: request.dispatchSession.id },
        data: { status: 'cancelled', nextExpandAt: null },
      })
    }
    await prisma.serviceRequest.update({
      where: { id: requestId },
      data: { status: 'open' },
    })

    const status = await startDispatchSession(requestId)
    return jsonOk(status)
  } catch (err) {
    return handleRouteError(err)
  }
}
