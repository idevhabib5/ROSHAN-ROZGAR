import { PrismaClient } from '@prisma/client'
import { DEMO_IDS } from '../lib/session'
import { AREAS } from '../lib/geo'

const prisma = new PrismaClient()

async function main() {
  await prisma.review.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.quote.deleteMany()
  await prisma.message.deleteMany()
  await prisma.dispatchNotification.deleteMany()
  await prisma.dispatchSession.deleteMany()
  await prisma.serviceRequest.deleteMany()
  await prisma.worker.deleteMany()
  await prisma.customer.deleteMany()

  const now = new Date()
  const g11 = AREAS['G-11']
  const f10 = AREAS['F-10']
  const g10 = AREAS['G-10']
  const f11 = AREAS['F-11']
  const i8 = AREAS['I-8']
  const g9 = AREAS['G-9']
  const blue = AREAS['BLUE AREA']

  await prisma.customer.create({
    data: {
      id: DEMO_IDS.customerAhmed,
      displayName: 'Ahmed Khan',
      serviceArea: f10.label,
      latitude: f10.latitude,
      longitude: f10.longitude,
      photoUrl:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
    },
  })

  const workers = [
    {
      id: DEMO_IDS.workerAli,
      displayName: 'Ali Raza',
      trade: 'Plumber',
      experienceYears: 5,
      serviceArea: g11.label,
      latitude: g11.latitude + 0.004,
      longitude: g11.longitude + 0.003,
      lastLat: g11.latitude + 0.004,
      lastLng: g11.longitude + 0.003,
      lastLocationAt: now,
      onlinePreference: true,
      accountStatus: 'active',
      verificationStatus: 'verified',
      visitChargePkr: 2500,
      onboardingMethod: 'seed',
      photoUrl:
        'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=200&h=200&fit=crop&crop=face',
    },
    {
      id: DEMO_IDS.workerImran,
      displayName: 'Imran Khan',
      trade: 'Plumber',
      experienceYears: 4,
      serviceArea: g10.label,
      latitude: g10.latitude,
      longitude: g10.longitude,
      lastLat: g10.latitude,
      lastLng: g10.longitude,
      lastLocationAt: now,
      onlinePreference: true,
      accountStatus: 'active',
      verificationStatus: 'verified',
      visitChargePkr: 2200,
      onboardingMethod: 'seed',
      photoUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    },
    {
      id: DEMO_IDS.workerWaqas,
      displayName: 'Waqas Ahmed',
      trade: 'Plumber',
      experienceYears: 6,
      serviceArea: f10.label,
      latitude: f10.latitude,
      longitude: f10.longitude,
      lastLat: f10.latitude,
      lastLng: f10.longitude,
      lastLocationAt: now,
      onlinePreference: false,
      accountStatus: 'active',
      verificationStatus: 'unverified',
      visitChargePkr: 2800,
      onboardingMethod: 'seed',
      photoUrl:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
    },
    {
      id: DEMO_IDS.workerBilal,
      displayName: 'Bilal Hussain',
      trade: 'Plumber',
      experienceYears: 7,
      serviceArea: f11.label,
      latitude: f11.latitude + 0.002,
      longitude: f11.longitude - 0.002,
      lastLat: f11.latitude + 0.002,
      lastLng: f11.longitude - 0.002,
      lastLocationAt: now,
      onlinePreference: true,
      accountStatus: 'active',
      verificationStatus: 'verified',
      visitChargePkr: 2000,
      onboardingMethod: 'seed',
      photoUrl:
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face',
    },
    {
      id: DEMO_IDS.workerUsman,
      displayName: 'Usman Ali',
      trade: 'Electrician',
      experienceYears: 5,
      serviceArea: g9.label,
      latitude: g9.latitude,
      longitude: g9.longitude,
      lastLat: g9.latitude,
      lastLng: g9.longitude,
      lastLocationAt: now,
      onlinePreference: true,
      accountStatus: 'active',
      verificationStatus: 'verified',
      visitChargePkr: 2300,
      onboardingMethod: 'seed',
      photoUrl:
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=face',
    },
    {
      id: DEMO_IDS.workerFarhan,
      displayName: 'Farhan Sheikh',
      trade: 'AC Technician',
      experienceYears: 8,
      serviceArea: i8.label,
      latitude: i8.latitude,
      longitude: i8.longitude,
      lastLat: i8.latitude,
      lastLng: i8.longitude,
      lastLocationAt: now,
      onlinePreference: true,
      accountStatus: 'active',
      verificationStatus: 'verified',
      visitChargePkr: 3000,
      onboardingMethod: 'seed',
      photoUrl:
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face',
    },
    {
      id: DEMO_IDS.workerHamza,
      displayName: 'Hamza Iqbal',
      trade: 'Carpenter',
      experienceYears: 6,
      serviceArea: blue.label,
      latitude: blue.latitude,
      longitude: blue.longitude,
      lastLat: blue.latitude,
      lastLng: blue.longitude,
      lastLocationAt: now,
      onlinePreference: true,
      accountStatus: 'active',
      verificationStatus: 'unverified',
      visitChargePkr: 2700,
      onboardingMethod: 'seed',
      photoUrl:
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=face',
    },
  ]

  await prisma.worker.createMany({ data: workers })

  const seedRequest = await prisma.serviceRequest.create({
    data: {
      customerId: DEMO_IDS.customerAhmed,
      trade: 'Plumber',
      title: 'Bathroom tap leak',
      issueDescription: 'Bathroom tap leak (seeded demo job)',
      location: g11.label,
      latitude: g11.latitude,
      longitude: g11.longitude,
      urgency: 'this_week',
      preferredTime: 'Last week',
      budgetPkr: 2000,
      status: 'booked',
    },
  })

  const seedQuote = await prisma.quote.create({
    data: {
      requestId: seedRequest.id,
      workerId: DEMO_IDS.workerAli,
      amountPkr: 1800,
      etaMinutes: 30,
      message: 'Seeded accepted offer',
      state: 'accepted',
    },
  })

  const seedBooking = await prisma.booking.create({
    data: {
      requestId: seedRequest.id,
      workerId: DEMO_IDS.workerAli,
      customerId: DEMO_IDS.customerAhmed,
      acceptedQuoteId: seedQuote.id,
      agreedAmountPkr: 1800,
      scheduledTime: 'Completed (seed)',
      status: 'completed',
    },
  })

  await prisma.review.create({
    data: {
      bookingId: seedBooking.id,
      workerId: DEMO_IDS.workerAli,
      customerId: DEMO_IDS.customerAhmed,
      rating: 5,
      comment: 'Bohot acha kaam kiya. Leak jaldi fix ho gaya. (demo seed)',
      isDemoSeed: true,
    },
  })

  const r2 = await prisma.serviceRequest.create({
    data: {
      customerId: DEMO_IDS.customerAhmed,
      trade: 'Plumber',
      title: 'Kitchen sink',
      issueDescription: 'Kitchen sink (seed)',
      location: g10.label,
      latitude: g10.latitude,
      longitude: g10.longitude,
      urgency: 'this_week',
      preferredTime: 'Seed',
      budgetPkr: 2200,
      status: 'booked',
    },
  })
  const q2 = await prisma.quote.create({
    data: {
      requestId: r2.id,
      workerId: DEMO_IDS.workerImran,
      amountPkr: 2000,
      etaMinutes: 25,
      state: 'accepted',
    },
  })
  const b2 = await prisma.booking.create({
    data: {
      requestId: r2.id,
      workerId: DEMO_IDS.workerImran,
      customerId: DEMO_IDS.customerAhmed,
      acceptedQuoteId: q2.id,
      agreedAmountPkr: 2000,
      scheduledTime: 'Seed',
      status: 'completed',
    },
  })
  await prisma.review.create({
    data: {
      bookingId: b2.id,
      workerId: DEMO_IDS.workerImran,
      customerId: DEMO_IDS.customerAhmed,
      rating: 5,
      comment: 'On time aaye aur qeemat fair thi. (demo seed)',
      isDemoSeed: true,
    },
  })

  console.log('Seeded Roshan Rozgar + dispatch demo data')
  console.log({
    customer: DEMO_IDS.customerAhmed,
    plumbersOnlineNearF10: [DEMO_IDS.workerAli, DEMO_IDS.workerImran, DEMO_IDS.workerBilal],
    offlinePlumber: DEMO_IDS.workerWaqas,
    electrician: DEMO_IDS.workerUsman,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
