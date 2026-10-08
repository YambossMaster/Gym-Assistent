import type { ReactNode } from 'react'

export function RequiredFieldMark() {
  return (
    <span className="ui-required-mark" aria-label="必填">
      *
    </span>
  )
}

export function RequiredFieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="ui-field-label">
      {children}
      <RequiredFieldMark />
    </span>
  )
}
