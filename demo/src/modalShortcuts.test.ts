import { describe, expect, it } from 'vitest'
import { shouldHandleDeleteShortcut } from './modalShortcuts'

describe('modal delete shortcut', () => {
  it('handles Delete when the modal provides a delete action', () => {
    expect(shouldHandleDeleteShortcut('Delete', 'BUTTON', false, true)).toBe(true)
    expect(shouldHandleDeleteShortcut('Delete', 'DIV', false, true)).toBe(true)
  })

  it('does not delete while the user is editing or when no delete action exists', () => {
    expect(shouldHandleDeleteShortcut('Delete', 'INPUT', false, true)).toBe(false)
    expect(shouldHandleDeleteShortcut('Delete', 'DIV', true, true)).toBe(false)
    expect(shouldHandleDeleteShortcut('Delete', 'DIV', false, false)).toBe(false)
  })
})
