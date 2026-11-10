export const DEMO_IDS = {
  customerAhmed: 'cust_ahmed_khan',
  workerAli: 'wrk_ali_raza',
  workerImran: 'wrk_imran_khan',
  workerWaqas: 'wrk_waqas_ahmed',
  workerBilal: 'wrk_bilal_hussain',
  workerUsman: 'wrk_usman_ali',
  workerFarhan: 'wrk_farhan_sheikh',
  workerHamza: 'wrk_hamza_iqbal',
} as const

export type DemoRole = 'worker' | 'customer'

export function parseDemoHeaders(headers: Headers) {
  const role = (headers.get('x-demo-role') || '') as DemoRole | ''
  const workerId = headers.get('x-demo-worker-id') || DEMO_IDS.workerAli
  const customerId = headers.get('x-demo-customer-id') || DEMO_IDS.customerAhmed
  return { role, workerId, customerId }
}
