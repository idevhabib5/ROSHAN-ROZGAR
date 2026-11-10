import { prisma } from './db'

export const ACTIVE_BOOKING_STATUSES = ['confirmed', 'in_progress'] as const

export async function isWorkerBookable(workerId: string) {
  const worker = await prisma.worker.findUnique({ where: { id: workerId } })
  if (!worker || !worker.onlinePreference) return false

  const active = await prisma.booking.findFirst({
    where: {
      workerId,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
    },
  })
  return !active
}

export async function confirmBooking(input: {
  requestId: string
  workerId: string
  customerId: string
  quoteId: string
  scheduledTime: string
}) {
  return prisma.$transaction(async (tx) => {
    const worker = await tx.worker.findUnique({ where: { id: input.workerId } })
    if (!worker) throw Object.assign(new Error('Worker not found'), { status: 404 })
    if (!worker.onlinePreference) {
      throw Object.assign(new Error('Worker is offline'), { status: 409, code: 'WORKER_OFFLINE' })
    }

    const active = await tx.booking.findFirst({
      where: {
        workerId: input.workerId,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
    })
    if (active) {
      throw Object.assign(new Error('Worker already engaged'), {
        status: 409,
        code: 'WORKER_ENGAGED',
      })
    }

    const quote = await tx.quote.findUnique({ where: { id: input.quoteId } })
    if (!quote || quote.workerId !== input.workerId || quote.requestId !== input.requestId) {
      throw Object.assign(new Error('Quote not found'), { status: 404 })
    }
    if (quote.state !== 'accepted') {
      throw Object.assign(new Error('Quote must be accepted before booking'), {
        status: 400,
        code: 'QUOTE_NOT_ACCEPTED',
      })
    }

    const booking = await tx.booking.create({
      data: {
        requestId: input.requestId,
        workerId: input.workerId,
        customerId: input.customerId,
        acceptedQuoteId: quote.id,
        agreedAmountPkr: quote.amountPkr,
        scheduledTime: input.scheduledTime,
        status: 'confirmed',
      },
    })

    await tx.serviceRequest.update({
      where: { id: input.requestId },
      data: { status: 'booked' },
    })

    return booking
  })
}

export async function getWorkerTrust(workerId: string) {
  const reviews = await prisma.review.findMany({ where: { workerId } })
  const completedJobs = await prisma.booking.count({
    where: { workerId, status: 'completed' },
  })
  const rating =
    reviews.length === 0
      ? null
      : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10

  return {
    rating,
    reviewCount: reviews.length,
    completedJobs,
    reviews: reviews
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10),
  }
}
