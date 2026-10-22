import { ArrowRight, Check } from 'lucide-react'
import { advanceTrainingSetInput, describeTrainingSetInput } from './set-input-navigation'

export function SetInputAdvanceDock({
  target,
  onBeforeAdvance,
  onGestureStart,
  onGestureRelease,
  onGestureEnd
}: {
  target: HTMLInputElement | null
  onBeforeAdvance?: (next: HTMLInputElement) => void
  onGestureStart?: () => void
  onGestureRelease?: () => void
  onGestureEnd?: () => void
}) {
  const step = describeTrainingSetInput(target)
  if (!step) return null
  return (
    <div className="set-input-advance-dock" aria-label="數據輸入導覽">
      <span aria-live="polite">{step.context}</span>
      <button
        type="button"
        onPointerDown={(event) => {
          event.preventDefault()
          onGestureStart?.()
        }}
        onPointerUp={onGestureRelease}
        onPointerCancel={onGestureEnd}
        onClick={() => {
          advanceTrainingSetInput(target, onBeforeAdvance)
          onGestureEnd?.()
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
