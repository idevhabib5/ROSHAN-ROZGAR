import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { loadEnvFile } from 'node:process'
import next from 'next'
import { Server } from 'socket.io'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Ensure Auth.js / Prisma see .env when running via custom Node server.
try {
  const envPath = resolve(process.cwd(), '.env')
  if (existsSync(envPath)) loadEnvFile(envPath)
} catch {
  // Older Node without loadEnvFile — Next still loads .env during prepare().
}

const dev = process.env.NODE_ENV !== 'production'
const port = Number(process.env.PORT || 3000)
/** Bind all interfaces so phone/LAN testing works; ticker still hits loopback */
const bindHost = process.env.HOST || '0.0.0.0'
const nextHostname = process.env.HOSTNAME || 'localhost'

const app = next({ dev, hostname: nextHostname, port })
const handle = app.getRequestHandler()

await app.prepare()

const httpServer = createServer(async (req, res) => {
  try {
    const rawUrl = req.url || '/'
    const base = `http://${req.headers.host || `${nextHostname}:${port}`}`
    const url = new URL(rawUrl, base)
    const parsedUrl = {
      pathname: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      path: rawUrl,
      href: rawUrl,
      search: url.search,
    }
    await handle(req, res, parsedUrl)
  } catch (err) {
    console.error('Error handling', req.method, req.url, err)
    if (!res.headersSent) {
      res.statusCode = 500
      res.end('internal server error')
    }
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

globalThis.__rr_emit = routeEvent

function lanAddresses() {
  const nets = networkInterfaces()
  const out = []
  for (const entries of Object.values(nets)) {
    for (const net of entries || []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address)
    }
  }
  return out
}

async function runTicker() {
  try {
    await fetch(`http://127.0.0.1:${port}/api/dispatch/tick`, {
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
  .listen(port, bindHost, () => {
    console.log(`> Roshan Rozgar (local test) ready`)
    console.log(`> Local:    http://localhost:${port}`)
    for (const ip of lanAddresses()) {
      console.log(`> Network:  http://${ip}:${port}`)
    }
    console.log(`> Socket.IO path: /api/socketio`)
    console.log(`> Dispatch ticker: every ${tickMs}ms`)
  })
