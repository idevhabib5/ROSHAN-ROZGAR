import { authProvidersAvailable } from '@/auth'
import { jsonOk } from '@/lib/api'

export async function GET() {
  return jsonOk(authProvidersAvailable())
}
