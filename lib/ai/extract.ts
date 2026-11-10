import { resolveArea, TRADES, type Trade } from '../geo'
import { geminiJson } from './gemini'

export type AiProvider = 'gemini' | 'openai' | 'heuristic'

export type WorkerProfileExtract = {
  name: string | null
  trade: Trade | null
  experienceYears: number | null
  serviceArea: string | null
  visitChargePkr: number | null
  missingFields: string[]
  provider: AiProvider
  confidence: 'high' | 'medium' | 'low'
}

export type ServiceRequestExtract = {
  trade: Trade | null
  issueDescription: string | null
  location: string | null
  urgency: string | null
  preferredTime: string | null
  latitude: number | null
  longitude: number | null
  missingFields: string[]
  provider: AiProvider
}

function detectTrade(text: string): Trade | null {
  const t = text.toLowerCase()
  if (/plumb|pipe|leak|nalki|پلمب/.test(t)) return 'Plumber'
  if (/electric|wiring|switch|bijli|الیکٹ/.test(t)) return 'Electrician'
  if (/ac\b|air.?cond|cooler|اے سی/.test(t)) return 'AC Technician'
  if (/carpent|wood|furniture|کارپن/.test(t)) return 'Carpenter'
  return null
}

function extractYears(text: string): number | null {
  const m =
    text.match(/(\d+)\s*(saal|سال|years?|yrs?)/i) ||
    text.match(/(\d+)\s*year/i)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n >= 0 && n <= 60 ? n : null
}

function extractCharge(text: string): number | null {
  const m =
    text.match(/(?:rs\.?|rupees?|qeemat|charge)\s*[:\-]?\s*(\d{3,6})/i) ||
    text.match(/(\d{3,6})\s*(?:rs\.?|rupees?)/i)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

function extractName(text: string): string | null {
  const m =
    text.match(/mera\s+naam\s+([A-Za-z\u0600-\u06FF\s]+?)(?:\s+hai|\.|,|$)/i) ||
    text.match(/my\s+name\s+is\s+([A-Za-z\s]+)/i)
  if (!m) return null
  return m[1].trim().replace(/\s+/g, ' ').slice(0, 60) || null
}

function missingOf(obj: Record<string, unknown>, keys: string[]) {
  return keys.filter((k) => obj[k] == null || obj[k] === '')
}

async function openaiJson<T>(system: string, user: string): Promise<T | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return null
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

async function llmJson<T>(system: string, user: string): Promise<{ data: T; provider: 'gemini' | 'openai' } | null> {
  const gemini = await geminiJson<T>(system, user)
  if (gemini) return { data: gemini, provider: 'gemini' }
  const openai = await openaiJson<T>(system, user)
  if (openai) return { data: openai, provider: 'openai' }
  return null
}

export async function extractWorkerProfile(transcript: string): Promise<WorkerProfileExtract> {
  const cleaned = transcript.trim()
  const llm = await llmJson<{
    name?: string | null
    trade?: string | null
    experience_years?: number | null
    service_area?: string | null
    visit_charge_pkr?: number | null
  }>(
    `Extract worker profile from Roman Urdu/Urdu/English speech. Return JSON keys: name, trade (one of ${TRADES.join(',')}), experience_years, service_area, visit_charge_pkr. Use null for unknown. Never invent.`,
    cleaned,
  )

  let name = llm?.data.name ?? null
  let trade = (llm?.data.trade as Trade | undefined) ?? null
  let experienceYears = llm?.data.experience_years ?? null
  let serviceArea = llm?.data.service_area ?? null
  let visitChargePkr = llm?.data.visit_charge_pkr ?? null
  const provider: AiProvider = llm?.provider ?? 'heuristic'

  if (!llm) {
    name = extractName(cleaned)
    trade = detectTrade(cleaned)
    experienceYears = extractYears(cleaned)
    const area = /G-1[01]|F-1[01]|I-8|Islamabad|Rawalpindi/i.test(cleaned)
      ? resolveArea(cleaned).label
      : null
    serviceArea = area
    visitChargePkr = extractCharge(cleaned)
  } else {
    if (trade && !TRADES.includes(trade as Trade)) trade = detectTrade(String(trade)) || detectTrade(cleaned)
    if (!name) name = extractName(cleaned)
    if (experienceYears == null) experienceYears = extractYears(cleaned)
    if (!serviceArea) {
      serviceArea = /G-1[01]|F-1[01]|I-8|Islamabad/i.test(cleaned)
        ? resolveArea(cleaned).label
        : null
    }
    if (visitChargePkr == null) visitChargePkr = extractCharge(cleaned)
  }

  if (trade && !TRADES.includes(trade)) trade = null

  const result = { name, trade, experienceYears, serviceArea, visitChargePkr }
  const missingFields = missingOf(result, [
    'name',
    'trade',
    'experienceYears',
    'serviceArea',
    'visitChargePkr',
  ])

  return {
    ...result,
    missingFields,
    provider,
    confidence: missingFields.length === 0 ? 'high' : missingFields.length <= 2 ? 'medium' : 'low',
  }
}

export async function extractServiceRequest(transcript: string): Promise<ServiceRequestExtract> {
  const cleaned = transcript.trim()
  const llm = await llmJson<{
    trade?: string | null
    issue_description?: string | null
    location?: string | null
    urgency?: string | null
    preferred_time?: string | null
  }>(
    `Extract home service request from Roman Urdu/Urdu/English. JSON keys: trade (one of ${TRADES.join(',')}), issue_description, location, urgency (today|tomorrow|this_week|urgent), preferred_time. Use null for unknown. Never invent pricing.`,
    cleaned,
  )

  let trade = (llm?.data.trade as Trade | undefined) ?? null
  let issueDescription = llm?.data.issue_description ?? null
  let location = llm?.data.location ?? null
  let urgency = llm?.data.urgency ?? null
  let preferredTime = llm?.data.preferred_time ?? null
  const provider: AiProvider = llm?.provider ?? 'heuristic'

  if (!llm) {
    trade = detectTrade(cleaned)
    issueDescription = cleaned.slice(0, 280) || null
    location = /G-1[01]|F-1[01]|I-8|Islamabad/i.test(cleaned)
      ? resolveArea(cleaned).label
      : null
    if (/aaj|today|abhi|urgent|foran/i.test(cleaned)) {
      urgency = 'today'
      preferredTime = 'Today'
    } else if (/kal|tomorrow/i.test(cleaned)) {
      urgency = 'tomorrow'
      preferredTime = 'Tomorrow'
    } else if (/hafte|week/i.test(cleaned)) {
      urgency = 'this_week'
      preferredTime = 'This week'
    } else {
      urgency = null
      preferredTime = null
    }
  } else {
    if (trade && !TRADES.includes(trade as Trade)) trade = detectTrade(String(trade)) || detectTrade(cleaned)
    if (!issueDescription) issueDescription = cleaned.slice(0, 280)
    if (!location && /G-1[01]|F-1[01]|I-8|Islamabad/i.test(cleaned)) {
      location = resolveArea(cleaned).label
    }
  }

  if (trade && !TRADES.includes(trade)) trade = null

  const area = location ? resolveArea(location) : null
  const result = {
    trade,
    issueDescription,
    location: location ?? (area ? area.label : null),
    urgency,
    preferredTime,
    latitude: area?.latitude ?? null,
    longitude: area?.longitude ?? null,
  }

  return {
    ...result,
    missingFields: missingOf(
      { trade: result.trade, issueDescription: result.issueDescription, location: result.location },
      ['trade', 'issueDescription', 'location'],
    ),
    provider,
  }
}
