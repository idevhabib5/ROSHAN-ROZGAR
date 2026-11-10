/** Haversine distance in km */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Rough degree delta for a km radius (Islamabad latitude ~33.7°) */
export function boundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  }
}

export type AreaPoint = { label: string; latitude: number; longitude: number }

/** Complete Islamabad sector / locality catalog (approx centroids) */
export const AREAS: Record<string, AreaPoint> = {
  // F sectors
  'F-5': { label: 'F-5, Islamabad', latitude: 33.729, longitude: 73.087 },
  'F-6': { label: 'F-6, Islamabad', latitude: 33.721, longitude: 73.078 },
  'F-7': { label: 'F-7, Islamabad', latitude: 33.715, longitude: 73.057 },
  'F-8': { label: 'F-8, Islamabad', latitude: 33.71, longitude: 73.04 },
  'F-9': { label: 'F-9, Islamabad', latitude: 33.702, longitude: 73.025 },
  'F-10': { label: 'F-10, Islamabad', latitude: 33.695, longitude: 73.01 },
  'F-11': { label: 'F-11, Islamabad', latitude: 33.685, longitude: 72.985 },
  'F-12': { label: 'F-12, Islamabad', latitude: 33.678, longitude: 72.965 },
  'F-13': { label: 'F-13, Islamabad', latitude: 33.672, longitude: 72.945 },
  'F-14': { label: 'F-14, Islamabad', latitude: 33.668, longitude: 72.925 },
  'F-15': { label: 'F-15, Islamabad', latitude: 33.662, longitude: 72.905 },
  // G sectors
  'G-5': { label: 'G-5, Islamabad', latitude: 33.715, longitude: 73.095 },
  'G-6': { label: 'G-6, Islamabad', latitude: 33.708, longitude: 73.085 },
  'G-7': { label: 'G-7, Islamabad', latitude: 33.702, longitude: 73.065 },
  'G-8': { label: 'G-8, Islamabad', latitude: 33.695, longitude: 73.045 },
  'G-9': { label: 'G-9, Islamabad', latitude: 33.685, longitude: 73.025 },
  'G-10': { label: 'G-10, Islamabad', latitude: 33.675, longitude: 73.005 },
  'G-11': { label: 'G-11, Islamabad', latitude: 33.6675, longitude: 72.992 },
  'G-12': { label: 'G-12, Islamabad', latitude: 33.66, longitude: 72.97 },
  'G-13': { label: 'G-13, Islamabad', latitude: 33.652, longitude: 72.95 },
  'G-14': { label: 'G-14, Islamabad', latitude: 33.645, longitude: 72.93 },
  'G-15': { label: 'G-15, Islamabad', latitude: 33.638, longitude: 72.91 },
  // I sectors
  'I-8': { label: 'I-8, Islamabad', latitude: 33.66, longitude: 73.07 },
  'I-9': { label: 'I-9, Islamabad', latitude: 33.65, longitude: 73.05 },
  'I-10': { label: 'I-10, Islamabad', latitude: 33.64, longitude: 73.03 },
  'I-11': { label: 'I-11, Islamabad', latitude: 33.632, longitude: 73.01 },
  'I-12': { label: 'I-12, Islamabad', latitude: 33.625, longitude: 72.99 },
  'I-13': { label: 'I-13, Islamabad', latitude: 33.618, longitude: 72.97 },
  'I-14': { label: 'I-14, Islamabad', latitude: 33.61, longitude: 72.95 },
  'I-15': { label: 'I-15, Islamabad', latitude: 33.602, longitude: 72.93 },
  'I-16': { label: 'I-16, Islamabad', latitude: 33.595, longitude: 72.91 },
  // E sectors
  'E-7': { label: 'E-7, Islamabad', latitude: 33.735, longitude: 73.055 },
  'E-8': { label: 'E-8, Islamabad', latitude: 33.728, longitude: 73.035 },
  'E-9': { label: 'E-9, Islamabad', latitude: 33.722, longitude: 73.015 },
  'E-10': { label: 'E-10, Islamabad', latitude: 33.715, longitude: 72.995 },
  'E-11': { label: 'E-11, Islamabad', latitude: 33.708, longitude: 72.975 },
  // H sectors
  'H-8': { label: 'H-8, Islamabad', latitude: 33.685, longitude: 73.08 },
  'H-9': { label: 'H-9, Islamabad', latitude: 33.675, longitude: 73.06 },
  'H-10': { label: 'H-10, Islamabad', latitude: 33.665, longitude: 73.04 },
  'H-11': { label: 'H-11, Islamabad', latitude: 33.655, longitude: 73.02 },
  'H-12': { label: 'H-12, Islamabad', latitude: 33.645, longitude: 73.0 },
  'H-13': { label: 'H-13, Islamabad', latitude: 33.635, longitude: 72.98 },
  // D sectors
  'D-12': { label: 'D-12, Islamabad', latitude: 33.695, longitude: 72.95 },
  'D-13': { label: 'D-13, Islamabad', latitude: 33.688, longitude: 72.93 },
  'D-14': { label: 'D-14, Islamabad', latitude: 33.68, longitude: 72.91 },
  // Named localities
  'BLUE AREA': { label: 'Blue Area, Islamabad', latitude: 33.712, longitude: 73.055 },
  'CENTAURUS': { label: 'Centaurus, Islamabad', latitude: 33.708, longitude: 73.05 },
  'ZERO POINT': { label: 'Zero Point, Islamabad', latitude: 33.693, longitude: 73.065 },
  'FAISAL MOSQUE': { label: 'Faisal Mosque, Islamabad', latitude: 33.729, longitude: 73.037 },
  'DIPLOMATIC ENCLAVE': {
    label: 'Diplomatic Enclave, Islamabad',
    latitude: 33.735,
    longitude: 73.095,
  },
  BARRACKS: { label: 'Barracks, Islamabad', latitude: 33.705, longitude: 73.09 },
  'SECTOR G': { label: 'Sector G, Islamabad', latitude: 33.675, longitude: 73.0 },
  'BAHRIA TOWN': { label: 'Bahria Town Phase 1-8, Islamabad', latitude: 33.57, longitude: 73.12 },
  'DHA ISLAMABAD': { label: 'DHA Islamabad', latitude: 33.53, longitude: 73.15 },
  'PWD HOUSING': { label: 'PWD Housing Society, Islamabad', latitude: 33.575, longitude: 73.14 },
  'GULBERG GREENS': { label: 'Gulberg Greens, Islamabad', latitude: 33.55, longitude: 73.16 },
  'SOAN GARDENS': { label: 'Soan Gardens, Islamabad', latitude: 33.545, longitude: 73.1 },
  'CHAKLALA': { label: 'Chaklala, Rawalpindi/Islamabad', latitude: 33.585, longitude: 73.1 },
  'AIRPORT': { label: 'Islamabad Airport Area', latitude: 33.55, longitude: 72.825 },
  'RAWAL LAKE': { label: 'Rawal Lake, Islamabad', latitude: 33.705, longitude: 73.125 },
  'SHAKARPARIAN': { label: 'Shakarparian, Islamabad', latitude: 33.69, longitude: 73.085 },
  'IJP ROAD': { label: 'IJP Road, Islamabad', latitude: 33.655, longitude: 73.055 },
  'SITARA MARKET': { label: 'Sitara Market, G-7, Islamabad', latitude: 33.705, longitude: 73.06 },
  'SUPER MARKET': { label: 'Super Market, F-6, Islamabad', latitude: 33.722, longitude: 73.075 },
  'KARACHI COMPANY': {
    label: 'Karachi Company, G-9, Islamabad',
    latitude: 33.688,
    longitude: 73.03,
  },
  'PUNJAB CHOWK': { label: 'Punjab Chowk, G-8, Islamabad', latitude: 33.698, longitude: 73.05 },
  'AYUB MARKET': { label: 'Ayub Market, F-8, Islamabad', latitude: 33.71, longitude: 73.04 },
}

export const AREA_KEYS = Object.keys(AREAS)

export function resolveArea(text: string) {
  const upper = text.toUpperCase().replace(/\s+/g, ' ').trim()
  // Prefer longer keys first (e.g. BLUE AREA before F-6 false matches)
  const keys = [...AREA_KEYS].sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (upper.includes(key)) return { key, ...AREAS[key] }
  }
  // Sector-style loose match: "g11" / "G 11"
  const sector = upper.match(/\b([FGEHID])[-\s]?(\d{1,2})\b/)
  if (sector) {
    const key = `${sector[1]}-${sector[2]}`
    if (AREAS[key]) return { key, ...AREAS[key] }
  }
  return { key: 'G-11', ...AREAS['G-11'] }
}

export function approxAreaLabel(location: string) {
  const resolved = resolveArea(location)
  return resolved.label
}

export const TRADES = ['Plumber', 'Electrician', 'AC Technician', 'Carpenter'] as const
export type Trade = (typeof TRADES)[number]
