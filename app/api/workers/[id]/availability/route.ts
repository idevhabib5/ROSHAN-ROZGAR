import { z } from 'zod'
import { prisma } from '@/lib/db'
import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import { ACTIVE_BOOKING_STATUSES } from '@/lib/booking'

const bodySchema = z.object({
  onlinePreference: z.boolean(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = bodySchema.parse(await req.json())
    const worker = await prisma.worker.findUnique({ where: { id } })
    if (!worker) return jsonError('Worker not found', 404)

    const updated = await prisma.worker.update({
      where: { id },
      data: {
        onlinePreference: body.onlinePreference,
        // Demo fallback: when going available, refresh freshness from last known coords
        // so matching works even if browser GPS is denied (browser GPS still preferred).
        ...(body.onlinePreference
          ? {
              lastLat: worker.lastLat ?? worker.latitude,
              lastLng: worker.lastLng ?? worker.longitude,
              lastLocationAt: new Date(),
            }
          : {}),
      },
    })

    const active = await prisma.booking.findFirst({
      where: { workerId: id, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
    })

    return jsonOk({
      ...updated,
      bookable: updated.onlinePreference && !active,
      engaged: Boolean(active),
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
