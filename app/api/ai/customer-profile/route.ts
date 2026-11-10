import { z } from 'zod'
import { extractCustomerProfile } from '@/lib/ai/extract'
import { handleRouteError, jsonOk } from '@/lib/api'

const bodySchema = z.object({
  transcript: z.string().min(2).max(4000),
})

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json())
    const result = await extractCustomerProfile(body.transcript)
    return jsonOk(result)
  } catch (err) {
    return handleRouteError(err)
  }
}
