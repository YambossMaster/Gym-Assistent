import type { KeyboardEvent } from 'react'

export function numericInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) return
  const key = event.key
  if (key === 'e' || key === 'E' || key === '+') event.preventDefault()
  else if (
    key === '-' &&
    event.currentTarget.dataset.allowNegative !== 'true' &&
    Number(event.currentTarget.min || 0) >= 0
  )
    event.preventDefault()
  else if (key === '.' && event.currentTarget.step === '1') event.preventDefault()
}
