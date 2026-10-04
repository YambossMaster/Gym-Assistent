import { ArrowRight, ChartNoAxesCombined, TrendingUp, WalletCards, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useDialogBehavior } from '../shared/useDialogBehavior'

export function PlanUpsellDialog({ title, onClose }: { title: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const { dialogRef, onBackdropPointerDown } = useDialogBehavior(onClose)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  const feature = featurePresentation(title)

  return createPortal(
    <div className="plan-upsell-backdrop" onPointerDown={onBackdropPointerDown}>
      <section
        ref={dialogRef}
        className="plan-upsell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-upsell-title"
      >
        <button
          ref={closeRef}
          type="button"
          className="plan-upsell-close"
          aria-label="關閉方案介紹"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
        <div className="plan-upsell-visual">
          <div className="plan-upsell-kicker">
            <img className="plan-upsell-kicker-mark" src="/brand/form-icon.png" alt="" /> FORM COACH
            DESK <span>／ PRO 功能</span>
          </div>
          <div className="plan-upsell-preview" aria-hidden="true">
            <div className="plan-upsell-preview-top">
              <feature.Icon />
              <span>{feature.previewLabel}</span>
            </div>
            <div className="plan-upsell-preview-lines">
              <i />
              <i />
              <i />
            </div>
            <div className="plan-upsell-preview-chart">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <span className="plan-upsell-visual-index">01 / 01</span>
        </div>
        <div className="plan-upsell-content">
          <div className="plan-upsell-heading">
            <span className="plan-upsell-eyebrow">為你的工作保留更多視野</span>
            <h2 id="plan-upsell-title">{title}</h2>
          </div>
          <p>{feature.description}</p>
          <div className="plan-upsell-divider" />
          <div className="plan-upsell-footer">
            <div className="plan-upsell-plan">
              <strong>Pro 與 Prime 方案</strong>
              <span>可使用此功能</span>
            </div>
            <Link className="plan-upsell-action" to="/settings?category=plans" onClick={onClose}>
              查看方案 <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <small>付費訂閱即將開放</small>
        </div>
      </section>
    </div>,
    document.body
  )
}

function featurePresentation(title: string) {
  switch (title) {
    case '本月收支':
      return {
        description: '整理每月購課、場地支出與收支紀錄。',
        previewLabel: '收支明細',
        Icon: WalletCards
      }
    case '個人運動表現':
      return {
        description: '集中查看動作紀錄與每次訓練的進步。',
        previewLabel: '運動表現',
        Icon: ChartNoAxesCombined
      }
    case '成長軌跡':
      return {
        description: '沿時間查看同一動作的表現變化。',
        previewLabel: '成長軌跡',
        Icon: TrendingUp
      }
    default:
      return {
        description: '查看這項功能的完整紀錄。',
        previewLabel: '完整紀錄',
        Icon: ChartNoAxesCombined
      }
  }
}

export function PlanLocked({ title }: { title: string }) {
  return (
    <section className="plan-locked" aria-label={title}>
      <span className="eyebrow dark">方案功能</span>
      <h2>{title}</h2>
      <p>Pro 與 Prime 方案可使用此功能。付費訂閱即將開放。</p>
      <Link className="primary-button compact" to="/settings?category=plans">
        查看方案
      </Link>
    </section>
  )
}
