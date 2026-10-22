export function selectTrainingSetValue(target: EventTarget | null) {
  if (!(target instanceof HTMLInputElement) || !target.matches('.training-set-card input')) return
  if (target.value !== '') target.select()
}

export function advanceTrainingSetInput(target: EventTarget | null) {
  if (!(target instanceof HTMLInputElement) || !target.matches('.training-set-card input')) return
  const exercise = target.closest('.training-exercise-card')
  if (!exercise) return
  const inputs = Array.from(exercise.querySelectorAll<HTMLInputElement>('.training-set-card input'))
  const next = inputs[inputs.indexOf(target) + 1]
  if (next) next.focus({ preventScroll: true })
  else target.blur()
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

// The iOS numeric keyboard can place its native navigation bar above the
// reported visual viewport edge. Keep the app's action dock clear of that bar.
export const SET_INPUT_KEYBOARD_CLEARANCE = 64

export function getSetInputDockInset({
  layoutHeight,
  visualHeight,
  visualOffsetTop
}: {
  layoutHeight: number
  visualHeight: number
  visualOffsetTop: number
}) {
  const keyboardHeight = layoutHeight - visualHeight
  if (keyboardHeight <= 120) return 0
  // A fixed element is positioned in the layout viewport. The keyboard edge is
  // the *bottom* of the visual viewport, which can pan without changing height.
  return Math.max(
    0,
    Math.round(layoutHeight - visualOffsetTop - visualHeight + SET_INPUT_KEYBOARD_CLEARANCE)
  )
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
