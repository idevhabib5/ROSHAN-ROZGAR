import { z } from 'zod'
import { prisma } from '@/lib/db'
import { handleRouteError, jsonOk } from '@/lib/api'

const createSchema = z.object({
  requestId: z.string().min(1),
  workerId: z.string().optional().nullable(),
  senderRole: z.enum(['customer', 'worker']),
  senderId: z.string().min(1),
  messageText: z.string().max(1000).optional().nullable(),
  audioLabel: z.string().max(200).optional().nullable(),
})

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json())
    const message = await prisma.message.create({
      data: {
        requestId: body.requestId,
        workerId: body.workerId || null,
        senderRole: body.senderRole,
        senderId: body.senderId,
        messageText: body.messageText || null,
        audioLabel: body.audioLabel || null,
      },
    })
    return jsonOk(message, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const requestId = searchParams.get('requestId')
    if (!requestId) {
      return handleRouteError(Object.assign(new Error('requestId required'), { status: 400 }))
    }
    const messages = await prisma.message.findMany({
      where: { requestId },
      orderBy: { createdAt: 'asc' },
    })
    return jsonOk({ messages })
  } catch (err) {
    return handleRouteError(err)
  }
}
