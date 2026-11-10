import { prisma } from '@/lib/db'
import { ACTIVE_BOOKING_STATUSES } from '@/lib/booking'
import { approxAreaLabel, boundingBox, distanceKm } from '@/lib/geo'
import { DISPATCH_CONFIG } from './config'

export type EligibleWorker = {
  id: string
  displayName: string
  trade: string
  photoUrl: string | null
  experienceYears: number
  verificationStatus: string
  visitChargePkr: number
  distanceKm: number
  approxArea: string
  latitude: number
  longitude: number
}

export async function findEligibleWorkers(input: {
  trade: string
  latitude: number
  longitude: number
  radiusKm: number
  excludeWorkerIds?: string[]
}): Promise<EligibleWorker[]> {
  const freshnessMs = DISPATCH_CONFIG.locationFreshnessSec * 1000
  const freshAfter = new Date(Date.now() - freshnessMs)
  const box = boundingBox(input.latitude, input.longitude, input.radiusKm)
  const exclude = new Set(input.excludeWorkerIds || [])

  const candidates = await prisma.worker.findMany({
    where: {
      trade: input.trade,
      accountStatus: 'active',
      onlinePreference: true,
      OR: [
        {
          lastLat: { gte: box.minLat, lte: box.maxLat },
          lastLng: { gte: box.minLng, lte: box.maxLng },
        },
        {
          lastLat: null,
          latitude: { gte: box.minLat, lte: box.maxLat },
          longitude: { gte: box.minLng, lte: box.maxLng },
        },
      ],
    },
  })

  const activeBookings = await prisma.booking.findMany({
    where: {
      workerId: { in: candidates.map((w) => w.id) },
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
    },
    select: { workerId: true },
  })
  const engaged = new Set(activeBookings.map((b) => b.workerId))

  const eligible: EligibleWorker[] = []
  for (const w of candidates) {
    if (exclude.has(w.id) || engaged.has(w.id)) continue
    if (DISPATCH_CONFIG.verificationRequired && w.verificationStatus !== 'verified') continue

    const lat = w.lastLat ?? w.latitude
    const lng = w.lastLng ?? w.longitude
    const locationAt = w.lastLocationAt
    if (!locationAt || locationAt < freshAfter) continue

    const dist = distanceKm(input.latitude, input.longitude, lat, lng)
    if (dist > input.radiusKm) continue

    eligible.push({
      id: w.id,
      displayName: w.displayName,
      trade: w.trade,
      photoUrl: w.photoUrl,
      experienceYears: w.experienceYears,
      verificationStatus: w.verificationStatus,
      visitChargePkr: w.visitChargePkr,
      distanceKm: Math.round(dist * 10) / 10,
      approxArea: approxAreaLabel(w.serviceArea),
      latitude: lat,
      longitude: lng,
    })
  }

  eligible.sort((a, b) => a.distanceKm - b.distanceKm)
  return eligible
}
