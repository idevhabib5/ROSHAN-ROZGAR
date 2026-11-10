import { prisma } from '@/lib/db'
import { approxAreaLabel } from '@/lib/geo'
import { DISPATCH_CONFIG, isLastStage, stageRadiusKm } from './config'
import { findEligibleWorkers } from './match'
import { emitDispatchEvent } from './bus'

export async function startDispatchSession(requestId: string) {
  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } })
  if (!request) throw Object.assign(new Error('Request not found'), { status: 404 })
  if (['assigned', 'booked', 'cancelled', 'expired'].includes(request.status)) {
    throw Object.assign(new Error('Request cannot start dispatch'), { status: 400 })
  }

  const existing = await prisma.dispatchSession.findUnique({ where: { requestId } })
  if (existing && ['searching', 'offers_received'].includes(existing.status)) {
    return getDispatchStatus(requestId)
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + DISPATCH_CONFIG.requestTtlSec * 1000)
  const radius = stageRadiusKm(0)
  const nextExpandAt = new Date(now.getTime() + DISPATCH_CONFIG.expandIntervalSec * 1000)

  const session = existing
    ? await prisma.dispatchSession.update({
        where: { id: existing.id },
        data: {
          status: 'searching',
          stageIndex: 0,
          currentRadiusKm: radius,
          notifiedCount: 0,
          offerCount: 0,
          nextExpandAt,
          expiresAt,
        },
      })
    : await prisma.dispatchSession.create({
        data: {
          requestId,
          status: 'searching',
          stageIndex: 0,
          currentRadiusKm: radius,
          nextExpandAt,
          expiresAt,
        },
      })

  await prisma.serviceRequest.update({
    where: { id: requestId },
    data: { status: 'searching' },
  })

  emitDispatchEvent('dispatch:started', {
    requestId,
    sessionId: session.id,
    radiusKm: radius,
    customerId: request.customerId,
  })

  await notifyWave(session.id)
  return getDispatchStatus(requestId)
}

async function notifyWave(sessionId: string) {
  const session = await prisma.dispatchSession.findUnique({
    where: { id: sessionId },
    include: { request: true, notifications: true },
  })
  if (!session || !['searching', 'offers_received'].includes(session.status)) return []

  const exclude = session.notifications.map((n) => n.workerId)
  const workers = await findEligibleWorkers({
    trade: session.request.trade,
    latitude: session.request.latitude,
    longitude: session.request.longitude,
    radiusKm: session.currentRadiusKm,
    excludeWorkerIds: exclude,
  })

  const deadline = new Date(Date.now() + DISPATCH_CONFIG.offerDeadlineSec * 1000)
  const created = []

  for (const w of workers) {
    try {
      const note = await prisma.dispatchNotification.create({
        data: {
          sessionId: session.id,
          requestId: session.requestId,
          workerId: w.id,
          distanceKm: w.distanceKm,
          approxArea: approxAreaLabel(session.request.location),
        },
      })
      created.push({ ...note, worker: w })

      emitDispatchEvent('job:new_request', {
        workerId: w.id,
        jobId: session.requestId,
        serviceCategory: session.request.trade,
        jobTitle: session.request.title || session.request.trade,
        shortDescription: session.request.issueDescription.slice(0, 160),
        approximateArea: approxAreaLabel(session.request.location),
        approximateDistanceKm: w.distanceKm,
        customerBudget: session.request.budgetPkr,
        preferredTime: session.request.preferredTime,
        urgency: session.request.urgency,
        offerDeadline: deadline.toISOString(),
        sessionId: session.id,
      })
    } catch {
      // unique constraint = already notified
    }
  }

  const notifiedCount = await prisma.dispatchNotification.count({ where: { sessionId } })
  await prisma.dispatchSession.update({
    where: { id: sessionId },
    data: { notifiedCount },
  })

  if (created.length === 0 && isLastStage(session.stageIndex)) {
    emitDispatchEvent('dispatch:no_workers', {
      requestId: session.requestId,
      customerId: session.request.customerId,
      radiusKm: session.currentRadiusKm,
    })
  }

  return created
}

export async function expandDispatchSession(sessionId: string) {
  const session = await prisma.dispatchSession.findUnique({
    where: { id: sessionId },
    include: { request: true },
  })
  if (!session || !['searching', 'offers_received'].includes(session.status)) return null
  if (isLastStage(session.stageIndex)) {
    await prisma.dispatchSession.update({
      where: { id: sessionId },
      data: { nextExpandAt: null },
    })
    return getDispatchStatus(session.requestId)
  }

  const nextIndex = session.stageIndex + 1
  const radius = stageRadiusKm(nextIndex)
  const nextExpandAt = isLastStage(nextIndex)
    ? null
    : new Date(Date.now() + DISPATCH_CONFIG.expandIntervalSec * 1000)

  await prisma.dispatchSession.update({
    where: { id: sessionId },
    data: {
      stageIndex: nextIndex,
      currentRadiusKm: radius,
      nextExpandAt,
    },
  })

  emitDispatchEvent('dispatch:radius_expanded', {
    requestId: session.requestId,
    customerId: session.request.customerId,
    radiusKm: radius,
    stageIndex: nextIndex,
  })

  await notifyWave(sessionId)
  return getDispatchStatus(session.requestId)
}

export async function cancelDispatch(requestId: string, customerId?: string) {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: { dispatchSession: { include: { notifications: true } } },
  })
  if (!request) throw Object.assign(new Error('Request not found'), { status: 404 })
  if (customerId && request.customerId !== customerId) {
    throw Object.assign(new Error('Forbidden'), { status: 403 })
  }
  if (['assigned', 'booked'].includes(request.status)) {
    throw Object.assign(new Error('Already assigned'), { status: 400 })
  }

  await prisma.serviceRequest.update({
    where: { id: requestId },
    data: { status: 'cancelled' },
  })
  if (request.dispatchSession) {
    await prisma.dispatchSession.update({
      where: { id: request.dispatchSession.id },
      data: { status: 'cancelled', nextExpandAt: null },
    })
    for (const n of request.dispatchSession.notifications) {
      emitDispatchEvent('job:request_cancelled', {
        workerId: n.workerId,
        jobId: requestId,
      })
    }
  }
  emitDispatchEvent('job:request_cancelled', {
    customerId: request.customerId,
    jobId: requestId,
  })
  return { ok: true }
}

export async function expireDispatch(sessionId: string) {
  const session = await prisma.dispatchSession.findUnique({
    where: { id: sessionId },
    include: { request: true, notifications: true },
  })
  if (!session || !['searching', 'offers_received'].includes(session.status)) return

  await prisma.dispatchSession.update({
    where: { id: sessionId },
    data: { status: 'expired', nextExpandAt: null },
  })
  await prisma.serviceRequest.update({
    where: { id: session.requestId },
    data: { status: 'expired' },
  })
  await prisma.quote.updateMany({
    where: { requestId: session.requestId, state: { in: ['active', 'proposed'] } },
    data: { state: 'expired' },
  })
  for (const n of session.notifications) {
    emitDispatchEvent('job:request_expired', {
      workerId: n.workerId,
      jobId: session.requestId,
    })
  }
}

export async function tickDispatchSessions() {
  const now = new Date()
  const open = await prisma.dispatchSession.findMany({
    where: { status: { in: ['searching', 'offers_received'] } },
  })

  for (const s of open) {
    if (s.expiresAt <= now) {
      await expireDispatch(s.id)
      continue
    }
    if (s.nextExpandAt && s.nextExpandAt <= now) {
      await expandDispatchSession(s.id)
    }
  }
}

export async function getDispatchStatus(requestId: string) {
  const session = await prisma.dispatchSession.findUnique({
    where: { requestId },
    include: {
      notifications: true,
      request: {
        include: {
          quotes: {
            where: { state: { in: ['active', 'proposed', 'accepted'] } },
            include: { worker: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  })
  if (!session) return null

  const offers = session.request.quotes.filter((q) =>
    ['active', 'proposed', 'accepted'].includes(q.state),
  )

  let phase = 'finding'
  if (session.status === 'cancelled') phase = 'cancelled'
  else if (session.status === 'expired') phase = 'expired'
  else if (session.status === 'assigned') phase = 'assigned'
  else if (offers.length > 0) phase = 'offers_received'
  else if (session.notifiedCount > 0) phase = 'workers_notified'
  else if (isLastStage(session.stageIndex)) phase = 'no_workers'
  else phase = 'finding'

  return {
    sessionId: session.id,
    requestId,
    status: session.status,
    phase,
    stageIndex: session.stageIndex,
    currentRadiusKm: session.currentRadiusKm,
    notifiedCount: session.notifiedCount,
    offerCount: offers.length,
    nextExpandAt: session.nextExpandAt,
    expiresAt: session.expiresAt,
    request: {
      id: session.request.id,
      trade: session.request.trade,
      title: session.request.title,
      location: approxAreaLabel(session.request.location),
      budgetPkr: session.request.budgetPkr,
      preferredTime: session.request.preferredTime,
      urgency: session.request.urgency,
      status: session.request.status,
    },
  }
}

export async function getWorkerOpportunities(workerId: string) {
  const notes = await prisma.dispatchNotification.findMany({
    where: { workerId },
    include: {
      request: true,
      session: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  return notes
    .filter((n) => ['searching', 'offers_received'].includes(n.session.status))
    .map((n) => ({
      notificationId: n.id,
      jobId: n.requestId,
      serviceCategory: n.request.trade,
      jobTitle: n.request.title || n.request.trade,
      shortDescription: n.request.issueDescription.slice(0, 160),
      approximateArea: n.approxArea,
      approximateDistanceKm: n.distanceKm,
      customerBudget: n.request.budgetPkr,
      preferredTime: n.request.preferredTime,
      urgency: n.request.urgency,
      sessionStatus: n.session.status,
      deliveredAt: n.deliveredAt,
    }))
}
