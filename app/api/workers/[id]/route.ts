import { prisma } from '@/lib/db'
import { getWorkerTrust, ACTIVE_BOOKING_STATUSES } from '@/lib/booking'
import { handleRouteError, jsonError, jsonOk } from '@/lib/api'
import { distanceKm, resolveArea } from '@/lib/geo'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const worker = await prisma.worker.findUnique({ where: { id } })
    if (!worker) return jsonError('Worker not found', 404)

    const { searchParams } = new URL(req.url)
    const lat = Number(searchParams.get('lat') ?? resolveArea('G-11').latitude)
    const lng = Number(searchParams.get('lng') ?? resolveArea('G-11').longitude)

    const active = await prisma.booking.findFirst({
      where: { workerId: id, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
    })
    const trust = await getWorkerTrust(id)
    const reviews = await prisma.review.findMany({
      where: { workerId: id },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return jsonOk({
      ...worker,
      distanceKm: Math.round(distanceKm(lat, lng, worker.latitude, worker.longitude) * 10) / 10,
      bookable: worker.onlinePreference && !active,
      engaged: Boolean(active),
      activeBookingId: active?.id ?? null,
      rating: trust.rating,
      reviewCount: trust.reviewCount,
      completedJobs: trust.completedJobs,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        isDemoSeed: r.isDemoSeed,
        customerName: r.customer.displayName,
        createdAt: r.createdAt,
      })),
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
