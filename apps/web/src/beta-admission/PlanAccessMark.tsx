export function PlanAccessMark({
  compact = false,
  tier = 'Pro'
}: {
  compact?: boolean
  tier?: 'Pro' | 'Prime'
}) {
  return (
    <span
      className={`plan-access-mark${compact ? ' plan-access-mark-compact' : ''}`}
      aria-label={`${tier} 功能，需方案解鎖`}
      title={`${tier} 方案可解鎖`}
    >
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M5.7 8.5V6.4a4.3 4.3 0 0 1 8.6 0v2.1"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
        <rect x="3" y="8.2" width="14" height="10" rx="2.4" fill="currentColor" />
        <circle cx="10" cy="12.2" r="1.15" fill="var(--plan-mark-cutout)" />
        <path d="M9.45 12.8h1.1l.45 2.1h-2z" fill="var(--plan-mark-cutout)" />
      </svg>
      <span>{tier}</span>
    </span>
  )
}
