import { Plus, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation } from 'react-router-dom'

export function MobileSettingsLink() {
  const location = useLocation()
  const inSettings = location.pathname === '/settings'
  const savedReturnTo = (location.state as { mobileSettingsReturnTo?: unknown } | null)
    ?.mobileSettingsReturnTo
  const returnTo =
    typeof savedReturnTo === 'string' &&
    savedReturnTo.startsWith('/') &&
    !savedReturnTo.startsWith('//') &&
    savedReturnTo.split(/[?#]/)[0] !== '/settings'
      ? savedReturnTo
      : '/today'

  return (
    <NavLink
      to={inSettings ? returnTo : '/settings'}
      state={
        inSettings
          ? null
          : { mobileSettingsReturnTo: location.pathname + location.search + location.hash }
      }
      replace={inSettings}
      aria-label={inSettings ? '返回原頁面' : '設定'}
    >
      <Settings aria-hidden="true" />
    </NavLink>
  )
}

export function MobilePageAppBar({
  title,
  count,
  addLabel,
  onAdd
}: {
  title: string
  count?: number
  addLabel?: string
  onAdd?: () => void
}) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setSlot(document.getElementById('mobile-route-header-slot'))
  }, [])

  if (!slot) return null
  return createPortal(
    <div className="mobile-route-header-content">
      <h1>
        {title}
        {count !== undefined && <span> ({count})</span>}
      </h1>
      <div className="mobile-route-header-actions">
        {addLabel && onAdd && (
          <button
            className="mobile-route-header-add"
            type="button"
            aria-label={addLabel}
            onClick={onAdd}
          >
            <Plus aria-hidden="true" />
          </button>
        )}
        <MobileSettingsLink />
      </div>
    </div>,
    slot
  )
}
