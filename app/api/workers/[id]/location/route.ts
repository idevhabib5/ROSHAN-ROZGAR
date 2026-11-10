import { z } from 'zod'
import { prisma } from '@/lib/db'
import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import { parseDemoHeaders } from '@/lib/session'

const bodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const headers = parseDemoHeaders(req.headers)
    if (headers.workerId !== id) {
      return jsonError('Forbidden', 403)
    }

    const body = bodySchema.parse(await req.json())
    const worker = await prisma.worker.findUnique({ where: { id } })
    if (!worker) return jsonError('Worker not found', 404)
    if (!worker.onlinePreference) {
      return jsonError('Turn availability ON before sending location', 400)
    }

    const updated = await prisma.worker.update({
      where: { id },
      data: {
        lastLat: body.latitude,
        lastLng: body.longitude,
        lastLocationAt: new Date(),
        latitude: body.latitude,
        longitude: body.longitude,
      },
    })

    return jsonOk({
      id: updated.id,
      lastLat: updated.lastLat,
      lastLng: updated.lastLng,
      lastLocationAt: updated.lastLocationAt,
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
