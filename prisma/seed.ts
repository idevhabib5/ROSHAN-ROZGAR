import { PrismaClient } from '@prisma/client'
import { DEMO_IDS } from '../lib/session'
import { AREAS } from '../lib/geo'

const prisma = new PrismaClient()

/** Profile photos from Random User (see Google Doc sample resources). */
const portrait = (n: number) => `https://randomuser.me/api/portraits/men/${n}.jpg`

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
  const g8 = AREAS['G-8']
  const f8 = AREAS['F-8']
  const blue = AREAS['BLUE AREA']
  const h9 = AREAS['H-9']

  await prisma.customer.createMany({
    data: [
      {
        id: DEMO_IDS.customerAhmed,
        displayName: 'Ahmed Khan',
        serviceArea: f10.label,
        latitude: f10.latitude,
        longitude: f10.longitude,
        photoUrl: portrait(32),
      },
      {
        id: 'cust_sara_malik',
        displayName: 'Sara Malik',
        serviceArea: g11.label,
        latitude: g11.latitude,
        longitude: g11.longitude,
        photoUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
      },
      {
        id: 'cust_omar_hassan',
        displayName: 'Omar Hassan',
        serviceArea: f11.label,
        latitude: f11.latitude,
        longitude: f11.longitude,
        photoUrl: portrait(52),
      },
      {
        id: 'cust_nadia_rehman',
        displayName: 'Nadia Rehman',
        serviceArea: g10.label,
        latitude: g10.latitude,
        longitude: g10.longitude,
        photoUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
      },
    ],
  })

  type SeedWorker = {
    id: string
    displayName: string
    trade: string
    experienceYears: number
    serviceArea: string
    latitude: number
    longitude: number
    lastLat: number
    lastLng: number
    lastLocationAt: Date
    onlinePreference: boolean
    accountStatus: string
    verificationStatus: string
    visitChargePkr: number
    onboardingMethod: string
    photoUrl: string
  }

  const mk = (
    partial: Omit<SeedWorker, 'lastLat' | 'lastLng' | 'lastLocationAt' | 'accountStatus' | 'onboardingMethod'> & {
      onlinePreference?: boolean
      verificationStatus?: string
    },
  ): SeedWorker => ({
    accountStatus: 'active',
    onboardingMethod: 'seed',
    lastLat: partial.latitude,
    lastLng: partial.longitude,
    lastLocationAt: now,
    onlinePreference: partial.onlinePreference ?? true,
    verificationStatus: partial.verificationStatus ?? 'verified',
    ...partial,
  })

  const workers: SeedWorker[] = [
    // Plumbers near F-10 / G-11 (show in default Workers list)
    mk({
      id: DEMO_IDS.workerAli,
      displayName: 'Ali Raza',
      trade: 'Plumber',
      experienceYears: 5,
      serviceArea: g11.label,
      latitude: g11.latitude + 0.004,
      longitude: g11.longitude + 0.003,
      visitChargePkr: 2500,
      photoUrl: portrait(1),
    }),
    mk({
      id: DEMO_IDS.workerImran,
      displayName: 'Imran Khan',
      trade: 'Plumber',
      experienceYears: 4,
      serviceArea: g10.label,
      latitude: g10.latitude,
      longitude: g10.longitude,
      visitChargePkr: 2200,
      photoUrl: portrait(2),
    }),
    mk({
      id: DEMO_IDS.workerWaqas,
      displayName: 'Waqas Ahmed',
      trade: 'Plumber',
      experienceYears: 6,
      serviceArea: f10.label,
      latitude: f10.latitude,
      longitude: f10.longitude,
      onlinePreference: false,
      verificationStatus: 'unverified',
      visitChargePkr: 2800,
      photoUrl: portrait(3),
    }),
    mk({
      id: DEMO_IDS.workerBilal,
      displayName: 'Bilal Hussain',
      trade: 'Plumber',
      experienceYears: 7,
      serviceArea: f11.label,
      latitude: f11.latitude + 0.002,
      longitude: f11.longitude - 0.002,
      visitChargePkr: 2000,
      photoUrl: portrait(4),
    }),
    mk({
      id: DEMO_IDS.workerSajid,
      displayName: 'Sajid Mehmood',
      trade: 'Plumber',
      experienceYears: 9,
      serviceArea: f10.label,
      latitude: f10.latitude + 0.003,
      longitude: f10.longitude - 0.002,
      visitChargePkr: 2600,
      photoUrl: portrait(11),
    }),
    mk({
      id: DEMO_IDS.workerTariq,
      displayName: 'Tariq Javed',
      trade: 'Plumber',
      experienceYears: 3,
      serviceArea: g11.label,
      latitude: g11.latitude - 0.002,
      longitude: g11.longitude + 0.001,
      visitChargePkr: 1800,
      photoUrl: portrait(12),
    }),
    // Electricians
    mk({
      id: DEMO_IDS.workerUsman,
      displayName: 'Usman Ali',
      trade: 'Electrician',
      experienceYears: 5,
      serviceArea: g9.label,
      latitude: g9.latitude,
      longitude: g9.longitude,
      visitChargePkr: 2300,
      photoUrl: portrait(5),
    }),
    mk({
      id: DEMO_IDS.workerNaveed,
      displayName: 'Naveed Akhtar',
      trade: 'Electrician',
      experienceYears: 8,
      serviceArea: f10.label,
      latitude: f10.latitude + 0.001,
      longitude: f10.longitude + 0.002,
      visitChargePkr: 2400,
      photoUrl: portrait(21),
    }),
    mk({
      id: DEMO_IDS.workerKashif,
      displayName: 'Kashif Malik',
      trade: 'Electrician',
      experienceYears: 4,
      serviceArea: g10.label,
      latitude: g10.latitude + 0.002,
      longitude: g10.longitude - 0.001,
      visitChargePkr: 2100,
      photoUrl: portrait(22),
    }),
    // AC Technicians
    mk({
      id: DEMO_IDS.workerFarhan,
      displayName: 'Farhan Sheikh',
      trade: 'AC Technician',
      experienceYears: 8,
      serviceArea: i8.label,
      latitude: i8.latitude,
      longitude: i8.longitude,
      visitChargePkr: 3000,
      photoUrl: portrait(6),
    }),
    mk({
      id: DEMO_IDS.workerAsad,
      displayName: 'Asad Nawaz',
      trade: 'AC Technician',
      experienceYears: 6,
      serviceArea: f11.label,
      latitude: f11.latitude,
      longitude: f11.longitude,
      visitChargePkr: 3200,
      photoUrl: portrait(31),
    }),
    mk({
      id: DEMO_IDS.workerRizwan,
      displayName: 'Rizwan Qureshi',
      trade: 'AC Technician',
      experienceYears: 10,
      serviceArea: g8.label,
      latitude: g8.latitude,
      longitude: g8.longitude,
      visitChargePkr: 3500,
      photoUrl: portrait(33),
    }),
    // Carpenters
    mk({
      id: DEMO_IDS.workerHamza,
      displayName: 'Hamza Iqbal',
      trade: 'Carpenter',
      experienceYears: 6,
      serviceArea: blue.label,
      latitude: blue.latitude,
      longitude: blue.longitude,
      verificationStatus: 'unverified',
      visitChargePkr: 2700,
      photoUrl: portrait(7),
    }),
    mk({
      id: DEMO_IDS.workerJunaid,
      displayName: 'Junaid Arif',
      trade: 'Carpenter',
      experienceYears: 5,
      serviceArea: f8.label,
      latitude: f8.latitude,
      longitude: f8.longitude,
      visitChargePkr: 2500,
      photoUrl: portrait(41),
    }),
    mk({
      id: DEMO_IDS.workerShahid,
      displayName: 'Shahid Anwar',
      trade: 'Carpenter',
      experienceYears: 12,
      serviceArea: h9.label,
      latitude: h9.latitude,
      longitude: h9.longitude,
      visitChargePkr: 2900,
      photoUrl: portrait(45),
    }),
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

  // Extra completed jobs + ratings for more sample profiles
  const extraReviews: { workerId: string; rating: number; comment: string }[] = [
    { workerId: DEMO_IDS.workerBilal, rating: 4, comment: 'Kaam theek tha, thora late aaye.' },
    { workerId: DEMO_IDS.workerSajid, rating: 5, comment: 'Experienced plumber. Recommend.' },
    { workerId: DEMO_IDS.workerNaveed, rating: 5, comment: 'Wiring issue jaldi solve ho gaya.' },
    { workerId: DEMO_IDS.workerAsad, rating: 4, comment: 'AC service achi thi.' },
    { workerId: DEMO_IDS.workerJunaid, rating: 5, comment: 'Furniture fit perfect.' },
  ]

  for (const [i, rev] of extraReviews.entries()) {
    const req = await prisma.serviceRequest.create({
      data: {
        customerId: DEMO_IDS.customerAhmed,
        trade: 'Plumber',
        title: `Seed job ${i + 1}`,
        issueDescription: `Seeded completed job ${i + 1}`,
        location: f10.label,
        latitude: f10.latitude,
        longitude: f10.longitude,
        urgency: 'this_week',
        preferredTime: 'Seed',
        budgetPkr: 2000,
        status: 'booked',
      },
    })
    const quote = await prisma.quote.create({
      data: {
        requestId: req.id,
        workerId: rev.workerId,
        amountPkr: 2000 + i * 100,
        etaMinutes: 20,
        state: 'accepted',
      },
    })
    const booking = await prisma.booking.create({
      data: {
        requestId: req.id,
        workerId: rev.workerId,
        customerId: DEMO_IDS.customerAhmed,
        acceptedQuoteId: quote.id,
        agreedAmountPkr: 2000 + i * 100,
        scheduledTime: 'Seed',
        status: 'completed',
      },
    })
    await prisma.review.create({
      data: {
        bookingId: booking.id,
        workerId: rev.workerId,
        customerId: DEMO_IDS.customerAhmed,
        rating: rev.rating,
        comment: rev.comment,
        isDemoSeed: true,
      },
    })
  }

  // Open nearby jobs (searching) so Worker home "Nearby job opportunities" looks live
  type OpenJob = {
    customerId: string
    trade: string
    title: string
    issueDescription: string
    location: string
    latitude: number
    longitude: number
    urgency: string
    preferredTime: string
    budgetPkr: number
    notifyWorkerIds: string[]
    distanceKm: number
  }

  const openJobs: OpenJob[] = [
    {
      customerId: 'cust_sara_malik',
      trade: 'Plumber',
      title: 'Kitchen sink blockage',
      issueDescription:
        'Kitchen sink drain is completely blocked. Water backs up every time we wash dishes. Need someone today if possible.',
      location: g11.label,
      latitude: g11.latitude + 0.001,
      longitude: g11.longitude - 0.001,
      urgency: 'today',
      preferredTime: 'Today afternoon',
      budgetPkr: 2500,
      notifyWorkerIds: [DEMO_IDS.workerAli, DEMO_IDS.workerTariq, DEMO_IDS.workerImran],
      distanceKm: 0.8,
    },
    {
      customerId: DEMO_IDS.customerAhmed,
      trade: 'Plumber',
      title: 'Bathroom geyser leak',
      issueDescription:
        'Geyser connection pipe leaking in attached bath. Floor getting wet. Looking for a quick visit charge quote.',
      location: f10.label,
      latitude: f10.latitude - 0.002,
      longitude: f10.longitude + 0.001,
      urgency: 'urgent',
      preferredTime: 'As soon as possible',
      budgetPkr: 3000,
      notifyWorkerIds: [DEMO_IDS.workerAli, DEMO_IDS.workerSajid, DEMO_IDS.workerBilal],
      distanceKm: 1.4,
    },
    {
      customerId: 'cust_omar_hassan',
      trade: 'Plumber',
      title: 'Toilet flush not working',
      issueDescription:
        'Flush tank fills but does not release properly. Need plumber who can bring common spare parts.',
      location: f11.label,
      latitude: f11.latitude + 0.0015,
      longitude: f11.longitude - 0.001,
      urgency: 'tomorrow',
      preferredTime: 'Tomorrow morning',
      budgetPkr: 2200,
      notifyWorkerIds: [DEMO_IDS.workerAli, DEMO_IDS.workerBilal],
      distanceKm: 2.1,
    },
    {
      customerId: 'cust_nadia_rehman',
      trade: 'Plumber',
      title: 'Main line low water pressure',
      issueDescription:
        'Whole house water pressure dropped since yesterday. Suspected blockage near outdoor valve.',
      location: g10.label,
      latitude: g10.latitude - 0.001,
      longitude: g10.longitude + 0.002,
      urgency: 'today',
      preferredTime: 'Today evening',
      budgetPkr: 3500,
      notifyWorkerIds: [DEMO_IDS.workerAli, DEMO_IDS.workerImran, DEMO_IDS.workerSajid],
      distanceKm: 1.7,
    },
    {
      customerId: 'cust_sara_malik',
      trade: 'Electrician',
      title: 'Power socket sparking',
      issueDescription:
        'Living room wall socket sparks when phone charger is plugged in. Need safe inspection today.',
      location: g11.label,
      latitude: g11.latitude - 0.0015,
      longitude: g11.longitude + 0.002,
      urgency: 'urgent',
      preferredTime: 'Today',
      budgetPkr: 2800,
      notifyWorkerIds: [DEMO_IDS.workerUsman, DEMO_IDS.workerNaveed, DEMO_IDS.workerKashif],
      distanceKm: 1.1,
    },
    {
      customerId: 'cust_omar_hassan',
      trade: 'AC Technician',
      title: 'Split AC not cooling',
      issueDescription:
        '1.5 ton split AC runs but air is warm. Last gas fill was 2 years ago. Prefer evening visit.',
      location: f11.label,
      latitude: f11.latitude - 0.002,
      longitude: f11.longitude + 0.0015,
      urgency: 'this_week',
      preferredTime: 'This week evening',
      budgetPkr: 4500,
      notifyWorkerIds: [DEMO_IDS.workerAsad, DEMO_IDS.workerFarhan],
      distanceKm: 1.9,
    },
  ]

  const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const nextExpandAt = new Date(now.getTime() + 90 * 1000)
  let openJobCount = 0

  for (const job of openJobs) {
    const request = await prisma.serviceRequest.create({
      data: {
        customerId: job.customerId,
        trade: job.trade,
        title: job.title,
        issueDescription: job.issueDescription,
        location: job.location,
        latitude: job.latitude,
        longitude: job.longitude,
        urgency: job.urgency,
        preferredTime: job.preferredTime,
        budgetPkr: job.budgetPkr,
        status: 'searching',
      },
    })

    const session = await prisma.dispatchSession.create({
      data: {
        requestId: request.id,
        status: 'searching',
        stageIndex: 1,
        currentRadiusKm: 5,
        notifiedCount: job.notifyWorkerIds.length,
        offerCount: 0,
        nextExpandAt,
        expiresAt,
      },
    })

    for (const [i, workerId] of job.notifyWorkerIds.entries()) {
      await prisma.dispatchNotification.create({
        data: {
          sessionId: session.id,
          requestId: request.id,
          workerId,
          distanceKm: Math.round((job.distanceKm + i * 0.3) * 10) / 10,
          approxArea: job.location,
        },
      })
    }
    openJobCount += 1
  }

  console.log('Seeded Roshan Rozgar sample workers with profiles')
  console.log({
    customer: DEMO_IDS.customerAhmed,
    workerCount: workers.length,
    openJobs: openJobCount,
    plumberInboxForAli: openJobs.filter((j) => j.notifyWorkerIds.includes(DEMO_IDS.workerAli)).length,
    trades: [...new Set(workers.map((w) => w.trade))],
    portraitSource: 'randomuser.me (Google Doc resources)',
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
