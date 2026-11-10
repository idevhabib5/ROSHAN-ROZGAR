import { prisma } from '@/lib/db'
import { ACTIVE_BOOKING_STATUSES, getWorkerTrust } from '@/lib/booking'
import { approxAreaLabel, distanceKm } from '@/lib/geo'
import { DISPATCH_CONFIG } from './config'
import { emitDispatchEvent } from './bus'

export async function submitOffer(input: {
  requestId: string
  workerId: string
  amountPkr: number
  etaMinutes: number
  message?: string | null
}) {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: input.requestId },
    include: { dispatchSession: { include: { notifications: true } } },
  })
  if (!request) throw Object.assign(new Error('Request not found'), { status: 404 })
  if (!['searching', 'offers_received', 'open', 'quoted'].includes(request.status)) {
    throw Object.assign(new Error('Request is not open for offers'), {
      status: 400,
      code: 'REQUEST_CLOSED',
    })
  }

  const worker = await prisma.worker.findUnique({ where: { id: input.workerId } })
  if (!worker || worker.accountStatus !== 'active') {
    throw Object.assign(new Error('Worker not eligible'), { status: 403 })
  }
  if (!worker.onlinePreference) {
    throw Object.assign(new Error('Worker is offline'), { status: 403 })
  }
  if (worker.trade !== request.trade) {
    throw Object.assign(new Error('Trade mismatch'), { status: 403 })
  }

  const engaged = await prisma.booking.findFirst({
    where: { workerId: input.workerId, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
  })
  if (engaged) {
    throw Object.assign(new Error('Worker already engaged'), {
      status: 409,
      code: 'WORKER_ENGAGED',
    })
  }

  if (request.dispatchSession) {
    const notified = request.dispatchSession.notifications.some(
      (n) => n.workerId === input.workerId,
    )
    if (!notified) {
      throw Object.assign(new Error('Worker was not notified for this job'), { status: 403 })
    }
    if (request.dispatchSession.expiresAt < new Date()) {
      throw Object.assign(new Error('Request expired'), { status: 400, code: 'EXPIRED' })
    }
  }

  const existingActive = await prisma.quote.findFirst({
    where: {
      requestId: input.requestId,
      workerId: input.workerId,
      state: { in: ['active', 'proposed'] },
    },
  })
  if (existingActive) {
    throw Object.assign(new Error('Duplicate active offer'), {
      status: 409,
      code: 'DUPLICATE_OFFER',
    })
  }

  const expiresAt = new Date(Date.now() + DISPATCH_CONFIG.offerDeadlineSec * 1000)
  const quote = await prisma.quote.create({
    data: {
      requestId: input.requestId,
      workerId: input.workerId,
      amountPkr: input.amountPkr,
      etaMinutes: input.etaMinutes,
      message: input.message || null,
      state: 'active',
      expiresAt,
    },
    include: { worker: true },
  })

  await prisma.serviceRequest.update({
    where: { id: input.requestId },
    data: { status: 'offers_received' },
  })

  if (request.dispatchSession) {
    const offerCount = await prisma.quote.count({
      where: { requestId: input.requestId, state: { in: ['active', 'proposed'] } },
    })
    await prisma.dispatchSession.update({
      where: { id: request.dispatchSession.id },
      data: { status: 'offers_received', offerCount },
    })
  }

  const lat = worker.lastLat ?? worker.latitude
  const lng = worker.lastLng ?? worker.longitude
  const dist = distanceKm(request.latitude, request.longitude, lat, lng)
  const trust = await getWorkerTrust(worker.id)

  const payload = {
    offerId: quote.id,
    requestId: input.requestId,
    customerId: request.customerId,
    amountPkr: quote.amountPkr,
    etaMinutes: quote.etaMinutes,
    message: quote.message,
    worker: {
      id: worker.id,
      displayName: worker.displayName,
      photoUrl: worker.photoUrl,
      trade: worker.trade,
      experienceYears: worker.experienceYears,
      verificationStatus: worker.verificationStatus,
      rating: trust.rating,
      reviewCount: trust.reviewCount,
      distanceKm: Math.round(dist * 10) / 10,
      approxArea: approxAreaLabel(worker.serviceArea),
    },
  }

  emitDispatchEvent('offer:received', payload)
  return payload
}

export async function withdrawOffer(offerId: string, workerId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: offerId },
    include: { request: true },
  })
  if (!quote) throw Object.assign(new Error('Offer not found'), { status: 404 })
  if (quote.workerId !== workerId) {
    throw Object.assign(new Error('Forbidden'), { status: 403 })
  }
  if (!['active', 'proposed'].includes(quote.state)) {
    throw Object.assign(new Error('Offer cannot be withdrawn'), { status: 400 })
  }
  if (['assigned', 'booked', 'cancelled', 'expired'].includes(quote.request.status)) {
    throw Object.assign(new Error('Request closed'), { status: 400 })
  }

  const updated = await prisma.quote.update({
    where: { id: offerId },
    data: { state: 'withdrawn' },
  })

  emitDispatchEvent('offer:withdrawn', {
    offerId,
    requestId: quote.requestId,
    customerId: quote.request.customerId,
    workerId,
  })
  return updated
}

export async function updateOffer(
  offerId: string,
  workerId: string,
  patch: { amountPkr?: number; etaMinutes?: number; message?: string | null },
) {
  const quote = await prisma.quote.findUnique({
    where: { id: offerId },
    include: { request: true },
  })
  if (!quote) throw Object.assign(new Error('Offer not found'), { status: 404 })
  if (quote.workerId !== workerId) {
    throw Object.assign(new Error('Forbidden'), { status: 403 })
  }
  if (!['active', 'proposed'].includes(quote.state)) {
    throw Object.assign(new Error('Offer not editable'), { status: 400 })
  }
  if (!['searching', 'offers_received', 'open', 'quoted'].includes(quote.request.status)) {
    throw Object.assign(new Error('Request closed'), { status: 400 })
  }

  const updated = await prisma.quote.update({
    where: { id: offerId },
    data: {
      amountPkr: patch.amountPkr ?? quote.amountPkr,
      etaMinutes: patch.etaMinutes ?? quote.etaMinutes,
      message: patch.message === undefined ? quote.message : patch.message,
    },
    include: { worker: true },
  })

  emitDispatchEvent('offer:updated', {
    offerId: updated.id,
    requestId: updated.requestId,
    customerId: quote.request.customerId,
    amountPkr: updated.amountPkr,
    etaMinutes: updated.etaMinutes,
    message: updated.message,
    workerId,
  })
  return updated
}

export async function listOffersForCustomer(requestId: string, customerId: string) {
  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } })
  if (!request) throw Object.assign(new Error('Request not found'), { status: 404 })
  if (request.customerId !== customerId) {
    throw Object.assign(new Error('Forbidden'), { status: 403 })
  }

  const quotes = await prisma.quote.findMany({
    where: {
      requestId,
      state: { in: ['active', 'proposed', 'accepted'] },
    },
    include: { worker: true },
    orderBy: { createdAt: 'asc' },
  })

  const results = []
  for (const q of quotes) {
    const trust = await getWorkerTrust(q.workerId)
    const lat = q.worker.lastLat ?? q.worker.latitude
    const lng = q.worker.lastLng ?? q.worker.longitude
    const dist = distanceKm(request.latitude, request.longitude, lat, lng)
    results.push({
      offerId: q.id,
      amountPkr: q.amountPkr,
      etaMinutes: q.etaMinutes,
      message: q.message,
      state: q.state,
      createdAt: q.createdAt,
      worker: {
        id: q.worker.id,
        displayName: q.worker.displayName,
        photoUrl: q.worker.photoUrl,
        trade: q.worker.trade,
        experienceYears: q.worker.experienceYears,
        verificationStatus: q.worker.verificationStatus,
        rating: trust.rating,
        reviewCount: trust.reviewCount,
        distanceKm: Math.round(dist * 10) / 10,
        approxArea: approxAreaLabel(q.worker.serviceArea),
      },
    })
  }
  return results
}

export async function acceptOffer(offerId: string, customerId: string) {
  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({
      where: { id: offerId },
      include: { request: true, worker: true },
    })
    if (!quote) throw Object.assign(new Error('Offer not found'), { status: 404 })
    if (quote.request.customerId !== customerId) {
      throw Object.assign(new Error('Forbidden'), { status: 403 })
    }
    if (!['active', 'proposed', 'accepted'].includes(quote.state)) {
      throw Object.assign(new Error('Offer not active'), { status: 400, code: 'OFFER_INACTIVE' })
    }
    if (quote.expiresAt && quote.expiresAt < new Date()) {
      throw Object.assign(new Error('Offer expired'), { status: 400, code: 'EXPIRED' })
    }
    if (!['searching', 'offers_received', 'open', 'quoted', 'price_agreed'].includes(quote.request.status)) {
      throw Object.assign(new Error('Request not open'), { status: 400, code: 'REQUEST_CLOSED' })
    }

    const existingBooking = await tx.booking.findUnique({
      where: { requestId: quote.requestId },
    })
    if (existingBooking) {
      throw Object.assign(new Error('Already assigned'), {
        status: 409,
        code: 'ALREADY_ASSIGNED',
      })
    }

    const workerActive = await tx.booking.findFirst({
      where: {
        workerId: quote.workerId,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
    })
    if (workerActive) {
      throw Object.assign(new Error('Worker already engaged'), {
        status: 409,
        code: 'WORKER_ENGAGED',
      })
    }

    // Mark accepted first so unique request booking is the concurrency gate
    await tx.quote.update({
      where: { id: quote.id },
      data: { state: 'accepted' },
    })
    await tx.quote.updateMany({
      where: {
        requestId: quote.requestId,
        id: { not: quote.id },
        state: { in: ['active', 'proposed'] },
      },
      data: { state: 'not_selected' },
    })

    await tx.serviceRequest.update({
      where: { id: quote.requestId },
      data: { status: 'assigned' },
    })

    const session = await tx.dispatchSession.findUnique({
      where: { requestId: quote.requestId },
      include: { notifications: true },
    })
    if (session) {
      await tx.dispatchSession.update({
        where: { id: session.id },
        data: { status: 'assigned', nextExpandAt: null },
      })
    }

    let booking
    try {
      booking = await tx.booking.create({
        data: {
          requestId: quote.requestId,
          workerId: quote.workerId,
          customerId,
          acceptedQuoteId: quote.id,
          agreedAmountPkr: quote.amountPkr,
          scheduledTime: quote.request.preferredTime,
          status: 'confirmed',
        },
      })
    } catch {
      throw Object.assign(new Error('Concurrent assignment rejected'), {
        status: 409,
        code: 'ALREADY_ASSIGNED',
      })
    }

    const others = await tx.quote.findMany({
      where: { requestId: quote.requestId, state: 'not_selected' },
    })

    // Emit after txn via deferred microtask using returned data
    queueMicrotask(() => {
      emitDispatchEvent('offer:accepted', {
        offerId: quote.id,
        bookingId: booking.id,
        workerId: quote.workerId,
        requestId: quote.requestId,
        customerId,
      })
      emitDispatchEvent('booking:confirmed', {
        bookingId: booking.id,
        requestId: quote.requestId,
        workerId: quote.workerId,
        customerId,
        amountPkr: quote.amountPkr,
      })
      for (const o of others) {
        emitDispatchEvent('offer:not_selected', {
          offerId: o.id,
          workerId: o.workerId,
          requestId: quote.requestId,
        })
      }
    })

    return { booking, quote }
  })
}
