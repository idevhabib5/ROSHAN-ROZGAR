import { z } from 'zod'
import { handleRouteError, jsonOk } from '@/lib/api'
import { updateOffer, withdrawOffer } from '@/lib/dispatch/offers'
import { parseDemoHeaders } from '@/lib/session'

const patchSchema = z.object({
  action: z.enum(['withdraw', 'update']).default('update'),
  amountPkr: z.number().int().min(100).max(500000).optional(),
  etaMinutes: z.number().int().min(5).max(240).optional(),
  message: z.string().max(500).optional().nullable(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { workerId } = parseDemoHeaders(req.headers)
    const body = patchSchema.parse(await req.json())

    if (body.action === 'withdraw') {
      const updated = await withdrawOffer(id, workerId)
      return jsonOk(updated)
    }

    const updated = await updateOffer(id, workerId, {
      amountPkr: body.amountPkr,
      etaMinutes: body.etaMinutes,
      message: body.message,
    })
    return jsonOk(updated)
  } catch (err) {
    return handleRouteError(err)
  }
}
