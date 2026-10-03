import { Link } from 'react-router-dom'

export function PlanLocked({ title }: { title: string }) {
  return (
    <section className="plan-locked" aria-label={title}>
      <span className="eyebrow dark">方案功能</span>
      <h2>{title}</h2>
      <p>基礎與進階方案可使用此功能。付費訂閱即將開放。</p>
      <Link className="primary-button compact" to="/settings?category=plans">
        查看方案
      </Link>
    </section>
  )
}
