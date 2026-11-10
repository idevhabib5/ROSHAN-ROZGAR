import { z } from 'zod'
import { handleRouteError, jsonOk } from '@/lib/api'
import { listOffersForCustomer, submitOffer } from '@/lib/dispatch/offers'
import { parseDemoHeaders } from '@/lib/session'

const createSchema = z.object({
  requestId: z.string().min(1),
  amountPkr: z.number().int().min(100).max(500000),
  etaMinutes: z.number().int().min(5).max(240),
  message: z.string().max(500).optional().nullable(),
})

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json())
    const { workerId } = parseDemoHeaders(req.headers)
    const offer = await submitOffer({
      requestId: body.requestId,
      workerId,
      amountPkr: body.amountPkr,
      etaMinutes: body.etaMinutes,
      message: body.message,
    })
    return jsonOk(offer, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const requestId = searchParams.get('requestId')
    if (!requestId) {
      return jsonOk({ offers: [] })
    }
    const { customerId } = parseDemoHeaders(req.headers)
    const offers = await listOffersForCustomer(requestId, customerId)
    return jsonOk({ offers })
  } catch (err) {
    return handleRouteError(err)
  }
}
