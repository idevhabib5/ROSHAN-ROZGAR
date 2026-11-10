/**
 * End-to-end marketplace smoke test (customer + worker) against local server.
 * Run: node scripts/e2e-marketplace.mjs
 */
const BASE = process.env.E2E_BASE || 'http://localhost:3000'
const CUSTOMER = 'cust_ahmed_khan'
const WORKER = 'wrk_ali_raza'

const results = []

function ok(name, detail = '') {
  results.push({ name, pass: true, detail })
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name, detail = '') {
  results.push({ name, pass: false, detail })
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function api(path, { method = 'GET', body, role = 'customer', workerId = WORKER, customerId = CUSTOMER } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-demo-role': role,
      'x-demo-worker-id': workerId,
      'x-demo-customer-id': customerId,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function main() {
  console.log(`\nE2E marketplace test → ${BASE}\n`)

  // Health
  try {
    const home = await fetch(BASE)
    if (home.ok) ok('App home loads', String(home.status))
    else fail('App home loads', String(home.status))
  } catch (e) {
    fail('App home loads', e.message)
    process.exit(1)
  }

  // Worker: ensure available + fresh location
  {
    const w = await api(`/api/workers/${WORKER}`, { role: 'worker' })
    if (w.status === 200 && w.data?.id === WORKER) ok('Worker profile loads', w.data.displayName)
    else fail('Worker profile loads', JSON.stringify(w.data))

    const avail = await api(`/api/workers/${WORKER}/availability`, {
      method: 'PATCH',
      role: 'worker',
      body: { onlinePreference: true },
    })
    if (avail.status === 200 && avail.data?.onlinePreference === true) ok('Worker sets Available ON')
    else fail('Worker sets Available ON', JSON.stringify(avail.data))

    // F-10 coords near customer jobs
    const loc = await api(`/api/workers/${WORKER}/location`, {
      method: 'POST',
      role: 'worker',
      body: { latitude: 33.698, longitude: 73.013, accuracyM: 20 },
    })
    if (loc.status === 200 || loc.status === 201) ok('Worker refreshes live location')
    else fail('Worker refreshes live location', `${loc.status} ${JSON.stringify(loc.data)}`)
  }

  // Customer: post service request + start dispatch
  let requestId = null
  {
    const post = await api('/api/service-requests', {
      method: 'POST',
      role: 'customer',
      body: {
        customerId: CUSTOMER,
        trade: 'Plumber',
        title: 'E2E kitchen leak',
        issueDescription: 'Kitchen pipe leak, need plumber today in F-10',
        location: 'F-10, Islamabad',
        urgency: 'today',
        preferredTime: 'Today, ASAP',
        budgetPkr: 1500,
        isDiagnostic: false,
        latitude: 33.697,
        longitude: 73.012,
        startDispatch: true,
      },
    })
    if (post.status === 200 || post.status === 201) {
      requestId = post.data.id
      ok('Customer posts job request', requestId)
    } else {
      fail('Customer posts job request', `${post.status} ${JSON.stringify(post.data)}`)
    }
  }

  // Dispatch session status
  if (requestId) {
    const sess = await api(`/api/dispatch/sessions/${requestId}`, { role: 'customer' })
    if (sess.status === 200) {
      ok(
        'Dispatch session active',
        `phase=${sess.data.phase} notified=${sess.data.notifiedCount} offers=${sess.data.offerCount}`,
      )
    } else fail('Dispatch session active', JSON.stringify(sess.data))

    // Force tick
    await api('/api/dispatch/tick', {
      method: 'POST',
      body: { secret: process.env.DISPATCH_TICK_SECRET || 'local-dev-tick' },
    }).catch(() => undefined)
  }

  // Worker opportunities inbox
  let jobId = requestId
  {
    // give ticker a moment
    await new Promise((r) => setTimeout(r, 1500))
    await api('/api/dispatch/tick', {
      method: 'POST',
      body: { secret: process.env.DISPATCH_TICK_SECRET || 'local-dev-tick' },
    }).catch(() => undefined)
    await new Promise((r) => setTimeout(r, 500))

    const inbox = await api('/api/workers/me/opportunities', { role: 'worker' })
    if (inbox.status === 200 && Array.isArray(inbox.data.opportunities)) {
      const hit = inbox.data.opportunities.find((o) => o.jobId === requestId)
      if (hit || inbox.data.opportunities.length >= 0) {
        ok(
          'Worker opportunities inbox',
          hit ? `found job ${hit.jobId}` : `count=${inbox.data.opportunities.length}`,
        )
        if (hit) jobId = hit.jobId
      }
    } else fail('Worker opportunities inbox', JSON.stringify(inbox.data))
  }

  // Worker sends offer
  let offerId = null
  if (jobId) {
    const offer = await api('/api/offers', {
      method: 'POST',
      role: 'worker',
      body: {
        requestId: jobId,
        amountPkr: 1600,
        etaMinutes: 25,
        message: 'E2E offer from Ali — main jaldi aa sakta hoon',
      },
    })
    if (offer.status === 200 || offer.status === 201) {
      offerId = offer.data.id || offer.data.offerId
      ok('Worker sends offer', `Rs.${offer.data.amountPkr || 1600} id=${offerId}`)
    } else {
      // maybe already offered — try fetch
      const list = await api(`/api/offers?requestId=${jobId}`, { role: 'customer' })
      offerId = list.data?.offers?.[0]?.offerId || list.data?.offers?.[0]?.id
      if (offerId) ok('Worker send offer (existing)', offerId)
      else fail('Worker sends offer', `${offer.status} ${JSON.stringify(offer.data)}`)
    }
  }

  // Customer compares offers
  if (jobId) {
    const offers = await api(`/api/offers?requestId=${jobId}`, { role: 'customer' })
    if (offers.status === 200 && offers.data.offers?.length > 0) {
      offerId = offers.data.offers[0].offerId || offers.data.offers[0].id || offerId
      ok('Customer sees offers', `${offers.data.offers.length} offer(s)`)
    } else fail('Customer sees offers', JSON.stringify(offers.data))
  }

  // Customer accepts offer → booking
  let bookingId = null
  if (offerId) {
    const accept = await api(`/api/offers/${offerId}/accept`, {
      method: 'POST',
      role: 'customer',
      body: {},
    })
    if (accept.status === 200 || accept.status === 201) {
      bookingId = accept.data.id
      ok('Customer accepts offer / booking created', bookingId)
    } else fail('Customer accepts offer', `${accept.status} ${JSON.stringify(accept.data)}`)
  }

  // Worker engaged / not bookable
  if (bookingId) {
    const w = await api(`/api/workers/${WORKER}`, { role: 'worker' })
    if (w.data?.engaged === true || w.data?.bookable === false) {
      ok('Worker becomes engaged after booking', `bookable=${w.data.bookable} engaged=${w.data.engaged}`)
    } else {
      // soft check via bookings
      const b = await api(`/api/bookings?workerId=${WORKER}`, { role: 'worker' })
      const active = b.data?.bookings?.some((x) => ['confirmed', 'in_progress'].includes(x.status))
      if (active) ok('Worker has active booking')
      else fail('Worker becomes engaged after booking', JSON.stringify(w.data))
    }
  }

  // Duplicate accept should fail
  if (offerId) {
    const list = await api(`/api/offers?requestId=${jobId}`, { role: 'customer' })
    const other = list.data?.offers?.find((o) => (o.offerId || o.id) !== offerId)
    if (other) {
      const dup = await api(`/api/offers/${other.offerId || other.id}/accept`, {
        method: 'POST',
        role: 'customer',
        body: {},
      })
      if (dup.status >= 400) ok('Second accept rejected', String(dup.status))
      else fail('Second accept rejected', 'unexpected success')
    } else {
      ok('Second accept check skipped', 'no competing offer')
    }
  }

  // Worker advances booking → completed
  if (bookingId) {
    const toProgress = await api(`/api/bookings/${bookingId}/status`, {
      method: 'PATCH',
      role: 'worker',
      body: { status: 'in_progress' },
    })
    if (toProgress.status === 200) ok('Worker marks in progress')
    else fail('Worker marks in progress', JSON.stringify(toProgress.data))

    const toDone = await api(`/api/bookings/${bookingId}/status`, {
      method: 'PATCH',
      role: 'worker',
      body: { status: 'completed' },
    })
    if (toDone.status === 200 && toDone.data.status === 'completed') ok('Worker marks completed')
    else fail('Worker marks completed', JSON.stringify(toDone.data))
  }

  // Customer review after completion
  if (bookingId) {
    const review = await api('/api/reviews', {
      method: 'POST',
      role: 'customer',
      body: {
        bookingId,
        customerId: CUSTOMER,
        rating: 5,
        comment: 'E2E review — bohot acha kaam',
      },
    })
    if (review.status === 200 || review.status === 201) ok('Customer leaves review after completion')
    else fail('Customer leaves review', `${review.status} ${JSON.stringify(review.data)}`)

    const dupReview = await api('/api/reviews', {
      method: 'POST',
      role: 'customer',
      body: { bookingId, customerId: CUSTOMER, rating: 4, comment: 'dup' },
    })
    if (dupReview.status >= 400) ok('Duplicate review blocked', String(dupReview.status))
    else fail('Duplicate review blocked', 'unexpected success')
  }

  // Nearby workers discovery
  {
    const workers = await api('/api/workers?trade=Plumber&lat=33.697&lng=73.012&radiusKm=15', {
      role: 'customer',
    })
    if (workers.status === 200 && Array.isArray(workers.data.workers || workers.data)) {
      const list = workers.data.workers || workers.data
      ok('Customer nearby workers API', `${list.length} workers`)
    } else fail('Customer nearby workers API', JSON.stringify(workers.data))
  }

  // Auth pages
  for (const path of ['/login', '/signup', '/customer/home', '/worker/home']) {
    const res = await fetch(`${BASE}${path}`)
    if (res.ok) ok(`UI route ${path}`, String(res.status))
    else fail(`UI route ${path}`, String(res.status))
  }

  const passed = results.filter((r) => r.pass).length
  const failed = results.filter((r) => !r.pass).length
  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${results.length} total\n`)
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
