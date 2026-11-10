import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { handleRouteError, jsonError, jsonOk } from '@/lib/api'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return jsonError('Unauthorized', 401)

    const user = await prisma.authUser.findUnique({
      where: { id: session.user.id },
    })
    if (!user) return jsonError('User not found', 404)

    const [worker, customer] = await Promise.all([
      user.workerId ? prisma.worker.findUnique({ where: { id: user.workerId } }) : null,
      user.customerId ? prisma.customer.findUnique({ where: { id: user.customerId } }) : null,
    ])

    return jsonOk({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      preferredRole: user.preferredRole,
      workerId: user.workerId,
      customerId: user.customerId,
      worker,
      customer,
      onboardingComplete: Boolean(
        (user.preferredRole === 'worker' && user.workerId) ||
          (user.preferredRole === 'customer' && user.customerId),
      ),
    })
  } catch (err) {
    return handleRouteError(err)
  }
}

const patchSchema = z.object({
  preferredRole: z.enum(['worker', 'customer']).optional(),
  workerId: z.string().min(1).optional().nullable(),
  customerId: z.string().min(1).optional().nullable(),
  name: z.string().min(2).max(80).optional(),
})

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return jsonError('Unauthorized', 401)

    const body = patchSchema.parse(await req.json())
    const user = await prisma.authUser.update({
      where: { id: session.user.id },
      data: {
        preferredRole: body.preferredRole,
        workerId: body.workerId === undefined ? undefined : body.workerId,
        customerId: body.customerId === undefined ? undefined : body.customerId,
        name: body.name,
      },
    })

    return jsonOk({
      id: user.id,
      preferredRole: user.preferredRole,
      workerId: user.workerId,
      customerId: user.customerId,
      name: user.name,
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
