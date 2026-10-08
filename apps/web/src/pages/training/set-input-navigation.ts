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
  if (next) next.focus()
  else target.blur()
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
