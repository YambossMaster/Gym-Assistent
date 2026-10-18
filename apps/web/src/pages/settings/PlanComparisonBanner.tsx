import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { localBillingEnabled } from '../../config'

export function PlanComparisonBanner({ onOpen }: { onOpen?: () => void }) {
  const content = (
    <>
      <span className="settings-plans-banner-copy">
        <small>FREE · PRO · PRIME</small>
        <strong>比較方案與價格</strong>
        <span>
          {onOpen || localBillingEnabled
            ? '查看各方案功能，找到適合你的選擇。'
            : 'Beta 期間先使用 Free；支付上線後開放選購。'}
        </span>
      </span>
      <span className="settings-plans-banner-action">
        查看所有方案 <ArrowRight aria-hidden="true" />
      </span>
    </>
  )
  return onOpen ? (
    <button type="button" className="settings-plans-banner billing-plans-banner" onClick={onOpen}>
      {content}
    </button>
  ) : (
    <Link className="settings-plans-banner" to="/plans">
      {content}
    </Link>
  )
}
