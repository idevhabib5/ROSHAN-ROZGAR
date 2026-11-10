import { z } from 'zod'
import { extractWorkerProfile } from '@/lib/ai/extract'
import { handleRouteError, jsonOk } from '@/lib/api'

const bodySchema = z.object({
  transcript: z.string().min(1).max(2000),
})

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json())
    const result = await extractWorkerProfile(body.transcript)
    return jsonOk(result)
  } catch (err) {
    return handleRouteError(err)
  }
}
