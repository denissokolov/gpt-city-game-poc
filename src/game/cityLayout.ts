export type MapCoord = { x: number; y: number }

const CURATED_POSITIONS: Record<string, MapCoord> = {
  '095d5e27-e582-4590-a438-2c8936bb4c01': { x: 0.72, y: 0.28 },
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function getLocationPosition(id: string, index: number, total: number): MapCoord {
  if (CURATED_POSITIONS[id]) return CURATED_POSITIONS[id]

  if (total <= 1) return { x: 0.5, y: 0.5 }

  const h = hashString(id)
  const cols = Math.max(2, Math.ceil(Math.sqrt(total)))
  const rows = Math.ceil(total / cols)
  const col = index % cols
  const row = Math.floor(index / cols)
  const jitterX = ((h & 0xff) / 255 - 0.5) * 0.08
  const jitterY = (((h >> 8) & 0xff) / 255 - 0.5) * 0.08
  const x = (col + 0.5) / cols + jitterX
  const y = (row + 0.5) / rows + jitterY
  return {
    x: Math.min(0.92, Math.max(0.08, x)),
    y: Math.min(0.9, Math.max(0.1, y)),
  }
}
