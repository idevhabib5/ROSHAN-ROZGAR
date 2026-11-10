import { z } from 'zod'
import { prisma } from '@/lib/db'
import { distanceKm, resolveArea, TRADES } from '@/lib/geo'
import { ACTIVE_BOOKING_STATUSES, getWorkerTrust } from '@/lib/booking'
import { handleRouteError, jsonError, jsonOk } from '@/lib/api'

const createSchema = z.object({
  displayName: z.string().min(2).max(80),
  trade: z.enum(TRADES as unknown as [string, ...string[]]),
  experienceYears: z.number().int().min(0).max(60),
  serviceArea: z.string().min(2).max(120),
  visitChargePkr: z.number().int().min(100).max(100000),
  onboardingMethod: z.string().default('voice'),
  photoUrl: z.string().url().optional().nullable(),
  onlinePreference: z.boolean().optional(),
})

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json())
    const area = resolveArea(body.serviceArea)
    const worker = await prisma.worker.create({
      data: {
        displayName: body.displayName,
        trade: body.trade,
        experienceYears: body.experienceYears,
        serviceArea: area.label,
        latitude: area.latitude + Math.random() * 0.006,
        longitude: area.longitude + Math.random() * 0.006,
        visitChargePkr: body.visitChargePkr,
        onboardingMethod: body.onboardingMethod,
        photoUrl: body.photoUrl || null,
        onlinePreference: body.onlinePreference ?? true,
      },
    })
    return jsonOk(worker, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const trade = searchParams.get('trade') || undefined
    const lat = Number(searchParams.get('lat') ?? resolveArea('G-11').latitude)
    const lng = Number(searchParams.get('lng') ?? resolveArea('G-11').longitude)
    const radiusKm = Number(searchParams.get('radiusKm') ?? 5)
    const includeOffline = searchParams.get('includeOffline') === '1'

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return jsonError('Invalid coordinates', 400)
    }

    const workers = await prisma.worker.findMany({
      where: trade ? { trade } : undefined,
    })

    const activeBookings = await prisma.booking.findMany({
      where: { status: { in: [...ACTIVE_BOOKING_STATUSES] } },
      select: { workerId: true },
    })
    const engaged = new Set(activeBookings.map((b) => b.workerId))

    const ranked = []
    for (const w of workers) {
      const dist = distanceKm(lat, lng, w.latitude, w.longitude)
      const bookable = w.onlinePreference && !engaged.has(w.id)
      if (!includeOffline && (!bookable || dist > radiusKm)) continue
      const trust = await getWorkerTrust(w.id)
      ranked.push({
        ...w,
        distanceKm: Math.round(dist * 10) / 10,
        bookable,
        engaged: engaged.has(w.id),
        rating: trust.rating,
        reviewCount: trust.reviewCount,
        completedJobs: trust.completedJobs,
      })
    }

    ranked.sort((a, b) => {
      if (a.bookable !== b.bookable) return a.bookable ? -1 : 1
      const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0)
      if (Math.abs(ratingDiff) > 0.05) return ratingDiff
      return a.distanceKm - b.distanceKm
    })

    return jsonOk({ workers: ranked, query: { trade, lat, lng, radiusKm } })
  } catch (err) {
    return handleRouteError(err)
  }
}
