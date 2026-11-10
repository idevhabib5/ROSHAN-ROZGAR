import { handleRouteError, jsonOk } from '@/lib/api'
import { getWorkerOpportunities } from '@/lib/dispatch/session'
import { parseDemoHeaders } from '@/lib/session'

export async function GET(req: Request) {
  try {
    const { workerId } = parseDemoHeaders(req.headers)
    const opportunities = await getWorkerOpportunities(workerId)
    return jsonOk({ opportunities })
  } catch (err) {
    return handleRouteError(err)
  }
}
