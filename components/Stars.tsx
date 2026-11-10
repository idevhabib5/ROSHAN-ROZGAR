'use client'

import { Star } from 'lucide-react'

export function Stars({
  value = 0,
  size = false,
  onChange,
}: {
  value?: number
  size?: boolean
  onChange?: (n: number) => void
}) {
  return (
    <div className="flex gap-1.5" style={{ color: '#FFC928' }} role="img" aria-label={`${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          aria-label={`${n} stars`}
          className="p-0 bg-transparent border-0 cursor-pointer"
          style={{
            color: n <= value ? '#FFC928' : '#d1d9d4',
            minWidth: size ? 44 : 28,
            minHeight: size ? 44 : 28,
          }}
        >
          <Star size={size ? 36 : 16} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}
