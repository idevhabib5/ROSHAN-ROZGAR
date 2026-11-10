function num(env: string | undefined, fallback: number) {
  const n = Number(env)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** Env-overridable dispatch tuning (not hardcoded at call sites) */
export const DISPATCH_CONFIG = {
  /** Progressive search radii in km */
  radiusStagesKm: (process.env.DISPATCH_RADIUS_STAGES || '3,5,10,15')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0) as number[],

  /** Seconds between radius expansions when offers are insufficient */
  expandIntervalSec: num(process.env.DISPATCH_EXPAND_INTERVAL_SEC, 30),

  /** Worker location must be fresher than this to count as nearby */
  locationFreshnessSec: num(process.env.DISPATCH_LOCATION_FRESHNESS_SEC, 120),

  /** Overall request/dispatch lifetime */
  requestTtlSec: num(process.env.DISPATCH_REQUEST_TTL_SEC, 900),

  /** Offer deadline from notify time */
  offerDeadlineSec: num(process.env.DISPATCH_OFFER_DEADLINE_SEC, 300),

  /** Background ticker interval inside Socket.IO process */
  tickerIntervalMs: num(process.env.DISPATCH_TICKER_MS, 5000),

  /** Optional: require verified workers (demo default off) */
  verificationRequired: process.env.DISPATCH_VERIFICATION_REQUIRED === '1',
}

if (DISPATCH_CONFIG.radiusStagesKm.length === 0) {
  DISPATCH_CONFIG.radiusStagesKm = [3, 5, 10, 15]
}

export function stageRadiusKm(stageIndex: number) {
  const stages = DISPATCH_CONFIG.radiusStagesKm
  return stages[Math.min(stageIndex, stages.length - 1)]
}

export function isLastStage(stageIndex: number) {
  return stageIndex >= DISPATCH_CONFIG.radiusStagesKm.length - 1
}
