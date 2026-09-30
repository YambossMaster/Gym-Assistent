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
