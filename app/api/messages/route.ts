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
  audioDataUrl: z
    .string()
    .max(1_200_000)
    .regex(/^data:audio\/[\w.+-]+;base64,/, 'Invalid audio data URL')
    .optional()
    .nullable(),
})

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json())
    if (!body.messageText && !body.audioDataUrl && !body.audioLabel) {
      return handleRouteError(
        Object.assign(new Error('Message text or voice note required'), { status: 400 }),
      )
    }
    const message = await prisma.message.create({
      data: {
        requestId: body.requestId,
        workerId: body.workerId || null,
        senderRole: body.senderRole,
        senderId: body.senderId,
        messageText: body.messageText || null,
        audioLabel: body.audioLabel || null,
        audioDataUrl: body.audioDataUrl || null,
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
