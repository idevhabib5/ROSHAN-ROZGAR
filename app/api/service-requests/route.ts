import { z } from 'zod'
import { prisma } from '@/lib/db'
import { resolveArea, TRADES } from '@/lib/geo'
import { handleRouteError, jsonOk } from '@/lib/api'
import { DEMO_IDS, parseDemoHeaders } from '@/lib/session'
import { startDispatchSession } from '@/lib/dispatch/session'

const createSchema = z.object({
  customerId: z.string().optional(),
  trade: z.enum(TRADES as unknown as [string, ...string[]]),
  title: z.string().min(2).max(120).optional(),
  issueDescription: z.string().min(3).max(500),
  location: z.string().min(2).max(120),
  urgency: z.string().min(2).max(40),
  preferredTime: z.string().min(1).max(80),
  budgetPkr: z.number().int().min(100).max(500000).optional(),
  isDiagnostic: z.boolean().optional(),
  mediaUrls: z.array(z.string().url()).max(8).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  startDispatch: z.boolean().optional().default(true),
})

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json())
    const headers = parseDemoHeaders(req.headers)
    const area = resolveArea(body.location)
    const request = await prisma.serviceRequest.create({
      data: {
        customerId: body.customerId || headers.customerId || DEMO_IDS.customerAhmed,
        trade: body.trade,
        title: body.title || `${body.trade} job`,
        issueDescription: body.issueDescription,
        location: area.label,
        latitude: body.latitude ?? area.latitude,
        longitude: body.longitude ?? area.longitude,
        urgency: body.urgency,
        preferredTime: body.preferredTime,
        budgetPkr: body.budgetPkr ?? null,
        isDiagnostic: body.isDiagnostic ?? false,
        mediaUrls: body.mediaUrls ? JSON.stringify(body.mediaUrls) : null,
        status: body.startDispatch ? 'searching' : 'open',
      },
    })

    let dispatch = null
    if (body.startDispatch) {
      dispatch = await startDispatchSession(request.id)
    }

    return jsonOk({ ...request, dispatch }, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customerId') || undefined
    const workerId = searchParams.get('workerId') || undefined
    const status = searchParams.get('status') || undefined

    if (workerId) {
      const worker = await prisma.worker.findUnique({ where: { id: workerId } })
      const requests = await prisma.serviceRequest.findMany({
        where: {
          OR: [
            {
              trade: worker?.trade,
              status: {
                in: ['open', 'quoted', 'price_agreed', 'searching', 'offers_received'],
              },
            },
            { quotes: { some: { workerId } } },
            { dispatchNotifications: { some: { workerId } } },
          ],
          ...(status ? { status } : {}),
        },
        include: {
          customer: true,
          quotes: { where: { workerId }, orderBy: { createdAt: 'desc' } },
          messages: { orderBy: { createdAt: 'asc' } },
          dispatchNotifications: { where: { workerId } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
      return jsonOk({ requests })
    }

    const requests = await prisma.serviceRequest.findMany({
      where: {
        ...(customerId ? { customerId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        customer: true,
        quotes: { include: { worker: true }, orderBy: { createdAt: 'desc' } },
        bookings: true,
        messages: { orderBy: { createdAt: 'asc' } },
        dispatchSession: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return jsonOk({ requests })
  } catch (err) {
    return handleRouteError(err)
  }
}
