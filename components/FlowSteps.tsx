'use client'

const CUSTOMER_STEPS = ['Request', 'Finding', 'Offers', 'Booking'] as const

export function CustomerFlowSteps({
  current,
}: {
  current: 'request' | 'finding' | 'offers' | 'booking'
}) {
  const index =
    current === 'request' ? 0 : current === 'finding' ? 1 : current === 'offers' ? 2 : 3

  return (
    <ol className="flow-steps" aria-label="Booking progress">
      {CUSTOMER_STEPS.map((label, i) => {
        const state = i < index ? 'done' : i === index ? 'current' : 'todo'
        return (
          <li key={label} className={`flow-step ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="flow-dot" aria-hidden>
              {i < index ? '✓' : i + 1}
            </span>
            <span className="flow-label">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
