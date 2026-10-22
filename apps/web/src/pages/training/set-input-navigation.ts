export function selectTrainingSetValue(target: EventTarget | null) {
  if (!(target instanceof HTMLInputElement) || !target.matches('.training-set-card input')) return
  if (target.value !== '') target.select()
}

export function advanceTrainingSetInput(
  target: EventTarget | null,
  beforeFocus?: (next: HTMLInputElement) => void
) {
  if (!(target instanceof HTMLInputElement) || !target.matches('.training-set-card input')) return
  const exercise = target.closest('.training-exercise-card')
  if (!exercise) return
  const inputs = Array.from(exercise.querySelectorAll<HTMLInputElement>('.training-set-card input'))
  const next = inputs[inputs.indexOf(target) + 1]
  if (next) {
    beforeFocus?.(next)
    next.focus({ preventScroll: true })
  } else target.blur()
}

export function getSetInputScrollAdjustment({
  inputTop,
  inputBottom,
  visibleTop,
  visibleBottom
}: {
  inputTop: number
  inputBottom: number
  visibleTop: number
  visibleBottom: number
}) {
  if (inputBottom > visibleBottom) return Math.ceil(inputBottom - visibleBottom)
  if (inputTop < visibleTop) return Math.floor(inputTop - visibleTop)
  return 0
}

// Give every focused set row the same resting position. When there is room,
// align it in the upper half of the space above the keyboard dock; otherwise
// only move far enough to keep the input clear of the dock.
export function getSetInputFocusAdjustment({
  inputTop,
  inputBottom,
  visibleTop,
  visibleBottom
}: {
  inputTop: number
  inputBottom: number
  visibleTop: number
  visibleBottom: number
}) {
  const visibilityAdjustment = getSetInputScrollAdjustment({
    inputTop,
    inputBottom,
    visibleTop,
    visibleBottom
  })
  const targetTop = visibleTop + Math.min(180, Math.max(0, (visibleBottom - visibleTop) * 0.4))
  const alignmentAdjustment = Math.round(inputTop - targetTop)
  // A very short visible area cannot fit the field at the preferred anchor.
  if (
    inputBottom - alignmentAdjustment > visibleBottom ||
    inputTop - alignmentAdjustment < visibleTop
  )
    return visibilityAdjustment
  return alignmentAdjustment
}

export function describeTrainingSetInput(target: EventTarget | null) {
  if (!(target instanceof HTMLInputElement) || !target.matches('.training-set-card input'))
    return null
  const exercise = target.closest<HTMLElement>('.training-exercise-card')
  const set = target.closest<HTMLElement>('.training-set-card')
  if (!exercise || !set) return null
  const sets = Array.from(exercise.querySelectorAll<HTMLElement>('.training-set-card'))
  const inputs = Array.from(exercise.querySelectorAll<HTMLInputElement>('.training-set-card input'))
  const inputIndex = inputs.indexOf(target)
  if (inputIndex < 0) return null
  const label = target.getAttribute('aria-label') ?? target.labels?.[0]?.getAttribute('aria-label')
  return {
    context: `第 ${sets.indexOf(set) + 1} 組 · ${(label ?? '數值').split('（')[0]}`,
    isLast: inputIndex === inputs.length - 1
  }
}
