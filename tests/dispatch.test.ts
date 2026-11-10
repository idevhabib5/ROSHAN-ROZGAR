import { beforeEach, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { DEMO_IDS } from '../lib/session'
import { AREAS } from '../lib/geo'
import { findEligibleWorkers } from '../lib/dispatch/match'
import { startDispatchSession, getWorkerOpportunities } from '../lib/dispatch/session'
import { acceptOffer, submitOffer } from '../lib/dispatch/offers'

const prisma = new PrismaClient()

async function refreshLocations() {
  const now = new Date()
  await prisma.worker.updateMany({
    data: {
      lastLocationAt: now,
      onlinePreference: true,
      accountStatus: 'active',
    },
  })
  // Keep Waqas offline for negative tests
  await prisma.worker.update({
    where: { id: DEMO_IDS.workerWaqas },
    data: { onlinePreference: false },
  })
}

async function clearOpenDispatchState() {
  // Free workers from active bookings created by tests (keep seeded completed history)
  await prisma.booking.updateMany({
    where: { status: { in: ['confirmed', 'in_progress'] } },
    data: { status: 'completed' },
  })
  await prisma.dispatchNotification.deleteMany({
    where: {
      request: { status: { in: ['searching', 'offers_received', 'assigned', 'open'] } },
    },
  })
}

beforeEach(async () => {
  await clearOpenDispatchState()
  await refreshLocations()
})

describe('inDrive-style dispatch matching', () => {
  it('finds available plumbers near F-10 within 3–10 km', async () => {
    const f10 = AREAS['F-10']
    const workers = await findEligibleWorkers({
      trade: 'Plumber',
      latitude: f10.latitude,
      longitude: f10.longitude,
      radiusKm: 10,
    })
    const ids = workers.map((w) => w.id)
    expect(ids).toContain(DEMO_IDS.workerAli)
    expect(ids).toContain(DEMO_IDS.workerImran)
    expect(ids).toContain(DEMO_IDS.workerBilal)
    expect(ids).not.toContain(DEMO_IDS.workerWaqas) // offline
    expect(ids).not.toContain(DEMO_IDS.workerUsman) // electrician
  })

  it('excludes electrician from plumbing match', async () => {
    const f10 = AREAS['F-10']
    const workers = await findEligibleWorkers({
      trade: 'Plumber',
      latitude: f10.latitude,
      longitude: f10.longitude,
      radiusKm: 15,
    })
    expect(workers.every((w) => w.trade === 'Plumber')).toBe(true)
  })

  it('excludes unavailable plumber', async () => {
    const f10 = AREAS['F-10']
    const workers = await findEligibleWorkers({
      trade: 'Plumber',
      latitude: f10.latitude,
      longitude: f10.longitude,
      radiusKm: 5,
    })
    expect(workers.map((w) => w.id)).not.toContain(DEMO_IDS.workerWaqas)
  })

  it('excludes stale location workers', async () => {
    const stale = new Date(Date.now() - 60 * 60 * 1000)
    await prisma.worker.update({
      where: { id: DEMO_IDS.workerBilal },
      data: { lastLocationAt: stale },
    })
    const f10 = AREAS['F-10']
    const workers = await findEligibleWorkers({
      trade: 'Plumber',
      latitude: f10.latitude,
      longitude: f10.longitude,
      radiusKm: 10,
    })
    expect(workers.map((w) => w.id)).not.toContain(DEMO_IDS.workerBilal)
    await prisma.worker.update({
      where: { id: DEMO_IDS.workerBilal },
      data: { lastLocationAt: new Date() },
    })
  })

  it('runs dispatch → offers → atomic accept', async () => {
    const f10 = AREAS['F-10']
    await refreshLocations()

    const request = await prisma.serviceRequest.create({
      data: {
        customerId: DEMO_IDS.customerAhmed,
        trade: 'Plumber',
        title: 'Kitchen Leakage Repair',
        issueDescription: 'Kitchen pipe leak — test',
        location: f10.label,
        latitude: f10.latitude,
        longitude: f10.longitude,
        urgency: 'urgent',
        preferredTime: 'Today ASAP',
        budgetPkr: 1500,
        status: 'open',
      },
    })

    const status1 = await startDispatchSession(request.id)
    expect(status1?.notifiedCount).toBeGreaterThanOrEqual(1)

    // Idempotent restart returns same open session
    const status2 = await startDispatchSession(request.id)
    expect(status2?.sessionId).toBe(status1?.sessionId)

    const notes = await prisma.dispatchNotification.findMany({
      where: { requestId: request.id },
    })
    const notifiedIds = notes.map((n) => n.workerId)
    expect(notifiedIds).not.toContain(DEMO_IDS.workerUsman)
    expect(notifiedIds).not.toContain(DEMO_IDS.workerWaqas)

    // Duplicate wave does not duplicate notifications
    const before = notes.length
    await startDispatchSession(request.id)
    const after = await prisma.dispatchNotification.count({ where: { requestId: request.id } })
    expect(after).toBe(before)

    const inbox = await getWorkerOpportunities(DEMO_IDS.workerAli)
    expect(inbox.some((o) => o.jobId === request.id)).toBe(true)

    const offerA = await submitOffer({
      requestId: request.id,
      workerId: DEMO_IDS.workerAli,
      amountPkr: 1300,
      etaMinutes: 15,
      message: 'Worker A',
    })
    const offerB = await submitOffer({
      requestId: request.id,
      workerId: DEMO_IDS.workerImran,
      amountPkr: 1500,
      etaMinutes: 10,
      message: 'Worker B',
    })

    await expect(
      submitOffer({
        requestId: request.id,
        workerId: DEMO_IDS.workerAli,
        amountPkr: 1200,
        etaMinutes: 20,
      }),
    ).rejects.toMatchObject({ code: 'DUPLICATE_OFFER' })

    const accepted = await acceptOffer(offerA.offerId, DEMO_IDS.customerAhmed)
    expect(accepted.booking.workerId).toBe(DEMO_IDS.workerAli)

    await expect(acceptOffer(offerB.offerId, DEMO_IDS.customerAhmed)).rejects.toMatchObject({
      code: expect.stringMatching(/OFFER_INACTIVE|REQUEST_CLOSED|ALREADY_ASSIGNED/),
    })

    const other = await prisma.quote.findUnique({ where: { id: offerB.offerId } })
    expect(other?.state).toBe('not_selected')

    const bookings = await prisma.booking.count({ where: { requestId: request.id } })
    expect(bookings).toBe(1)
  })

  it('blocks offers on cancelled requests', async () => {
    const f10 = AREAS['F-10']
    await refreshLocations()
    const request = await prisma.serviceRequest.create({
      data: {
        customerId: DEMO_IDS.customerAhmed,
        trade: 'Plumber',
        title: 'Cancel test',
        issueDescription: 'Cancel me',
        location: f10.label,
        latitude: f10.latitude,
        longitude: f10.longitude,
        urgency: 'today',
        preferredTime: 'Now',
        budgetPkr: 1200,
        status: 'open',
      },
    })
    await startDispatchSession(request.id)
    await prisma.serviceRequest.update({
      where: { id: request.id },
      data: { status: 'cancelled' },
    })
    await expect(
      submitOffer({
        requestId: request.id,
        workerId: DEMO_IDS.workerAli,
        amountPkr: 1000,
        etaMinutes: 15,
      }),
    ).rejects.toMatchObject({ code: 'REQUEST_CLOSED' })
  })
})
