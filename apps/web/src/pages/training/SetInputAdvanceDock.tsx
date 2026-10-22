import { ArrowRight, Check } from 'lucide-react'
import { useRef } from 'react'
import { advanceTrainingSetInput, describeTrainingSetInput } from './set-input-navigation'

export function SetInputAdvanceDock({
  target,
  onBeforeAdvance,
  onGestureStart,
  onGestureRelease,
  onGestureEnd,
  onComplete
}: {
  target: HTMLInputElement | null
  onBeforeAdvance?: (next: HTMLInputElement) => void
  onGestureStart?: () => void
  onGestureRelease?: () => void
  onGestureEnd?: () => void
  onComplete?: () => void
}) {
  const advancedOnPointerUp = useRef(false)
  const advance = () => {
    advanceTrainingSetInput(target, onBeforeAdvance)
    if (describeTrainingSetInput(target)?.isLast) onComplete?.()
    onGestureEnd?.()
  }
  const step = describeTrainingSetInput(target)
  if (!step) return null
  return (
    <div className="set-input-advance-dock" aria-label="數據輸入導覽">
      <span aria-live="polite">{step.context}</span>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onKeyDown={() => {
          advancedOnPointerUp.current = false
        }}
        onPointerDown={(event) => {
          event.preventDefault()
          advancedOnPointerUp.current = false
          onGestureStart?.()
        }}
        onPointerUp={(event) => {
          event.preventDefault()
          advancedOnPointerUp.current = true
          onGestureRelease?.()
          // WebKit can suppress the compatibility click after a cancelled
          // pointerdown. Focus within this actual release gesture instead.
          advance()
        }}
        onPointerCancel={onGestureEnd}
        onClick={() => {
          if (advancedOnPointerUp.current) {
            advancedOnPointerUp.current = false
            return
          }
          advance()
        }}
      >
        {step.isLast ? (
          <>
            <Check aria-hidden="true" /> 完成輸入
          </>
        ) : (
          <>
            下一格 <ArrowRight aria-hidden="true" />
          </>
        )}
      </button>
    </div>
  )
}
