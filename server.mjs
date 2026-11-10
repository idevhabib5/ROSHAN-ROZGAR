import { createServer } from 'node:http'
import { parse } from 'node:url'
import next from 'next'
import { Server } from 'socket.io'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = Number(process.env.PORT || 3000)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

await app.prepare()

const httpServer = createServer(async (req, res) => {
  try {
    const parsedUrl = parse(req.url, true)
    await handle(req, res, parsedUrl)
  } catch (err) {
    console.error('Error handling', req.url, err)
    res.statusCode = 500
    res.end('internal server error')
  }
})

const io = new Server(httpServer, {
  path: '/api/socketio',
  cors: { origin: true, credentials: true },
})

globalThis.__rr_io = io

io.use((socket, nextFn) => {
  const role = socket.handshake.auth?.role
  const workerId = socket.handshake.auth?.workerId
  const customerId = socket.handshake.auth?.customerId
  if (role !== 'worker' && role !== 'customer') {
    return nextFn(new Error('Unauthorized'))
  }
  if (role === 'worker' && !workerId) return nextFn(new Error('Missing workerId'))
  if (role === 'customer' && !customerId) return nextFn(new Error('Missing customerId'))
  socket.data.role = role
  socket.data.workerId = workerId || null
  socket.data.customerId = customerId || null
  nextFn()
})

io.on('connection', (socket) => {
  if (socket.data.role === 'worker' && socket.data.workerId) {
    socket.join(`worker:${socket.data.workerId}`)
  }
  if (socket.data.role === 'customer' && socket.data.customerId) {
    socket.join(`customer:${socket.data.customerId}`)
  }

  socket.on('worker:availability_update', () => {
    // Mutations go through REST; acknowledge only
    socket.emit('ack', { event: 'worker:availability_update' })
  })
  socket.on('worker:location_update', () => {
    socket.emit('ack', { event: 'worker:location_update' })
  })
  socket.on('offer:submit', () => {
    socket.emit('ack', { event: 'offer:submit' })
  })
})

function routeEvent(event, payload) {
  if (!payload || typeof payload !== 'object') return
  const p = payload
  if (p.workerId) io.to(`worker:${p.workerId}`).emit(event, payload)
  if (p.customerId) io.to(`customer:${p.customerId}`).emit(event, payload)
}

// Wire dispatch bus from compiled TS via dynamic import of Next server modules is hard.
// Instead expose a global emit used by API via HTTP internal hook + poll ticker below.
globalThis.__rr_emit = routeEvent

async function runTicker() {
  try {
    // Call internal tick API so Prisma/TS libs stay in Next runtime
    await fetch(`http://${hostname}:${port}/api/dispatch/tick`, {
      method: 'POST',
      headers: { 'x-dispatch-tick-secret': process.env.DISPATCH_TICK_SECRET || 'local-dev-tick' },
    })
  } catch (err) {
    if (dev) console.warn('dispatch tick failed', err.message)
  }
}

const tickMs = Number(process.env.DISPATCH_TICKER_MS || 5000)
setInterval(runTicker, tickMs)

httpServer
  .once('error', (err) => {
    console.error(err)
    process.exit(1)
  })
  .listen(port, () => {
    console.log(`> Roshan Rozgar ready on http://${hostname}:${port} (Socket.IO /api/socketio)`)
  })
