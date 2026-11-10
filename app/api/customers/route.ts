import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { resolveArea } from '@/lib/geo'
import { handleRouteError, jsonOk } from '@/lib/api'

const createSchema = z.object({
  displayName: z.string().min(2).max(80),
  serviceArea: z.string().min(2).max(120),
  photoUrl: z
    .union([z.string().url(), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
})

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json())
    const area = resolveArea(body.serviceArea)
    const session = await auth()
    const photoUrl = body.photoUrl || session?.user?.image || null
    const authRow = session?.user?.id
      ? await prisma.authUser.findUnique({ where: { id: session.user.id } })
      : null

    const data = {
      displayName: body.displayName,
      serviceArea: area.label,
      latitude: area.latitude + Math.random() * 0.004,
      longitude: area.longitude + Math.random() * 0.004,
      photoUrl,
    }

    const customer = authRow?.customerId
      ? await prisma.customer.update({ where: { id: authRow.customerId }, data })
      : await prisma.customer.create({ data })

    if (session?.user?.id) {
      await prisma.authUser.update({
        where: { id: session.user.id },
        data: {
          preferredRole: 'customer',
          customerId: customer.id,
          name: body.displayName,
        },
      })
    }

    return jsonOk(customer, authRow?.customerId ? 200 : 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
