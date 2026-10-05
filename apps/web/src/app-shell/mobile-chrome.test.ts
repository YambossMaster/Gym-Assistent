import { describe, expect, it } from 'vitest'
import {
  createMobileChromeScrollState,
  shouldAutoHideMobileChrome,
  updateMobileChromeScrollState
} from './mobile-chrome'

describe('mobile chrome scroll visibility', () => {
  it('keeps Today and Calendar pinned', () => {
    expect(shouldAutoHideMobileChrome('/today')).toBe(false)
    expect(shouldAutoHideMobileChrome('/calendar')).toBe(false)
    expect(shouldAutoHideMobileChrome('/students')).toBe(true)
    expect(shouldAutoHideMobileChrome('/settings')).toBe(true)
    expect(shouldAutoHideMobileChrome('/sessions/session-id')).toBe(true)
  })

  it('hides only after downward document movement accumulates past the threshold', () => {
    let state = createMobileChromeScrollState(0)
    state = updateMobileChromeScrollState(state, 10)
    state = updateMobileChromeScrollState(state, 22)
    expect(state.hidden).toBe(false)

    state = updateMobileChromeScrollState(state, 34)
    expect(state.hidden).toBe(true)
  })

  it('reveals promptly after the document reverses upward', () => {
    let state = createMobileChromeScrollState(120)
    state = { ...state, hidden: true }
    state = updateMobileChromeScrollState(state, 114)
    expect(state.hidden).toBe(true)

    state = updateMobileChromeScrollState(state, 107)
    expect(state.hidden).toBe(false)
  })

  it('resets accumulated distance when direction changes', () => {
    let state = createMobileChromeScrollState(40)
    state = updateMobileChromeScrollState(state, 55)
    state = updateMobileChromeScrollState(state, 50)
    state = updateMobileChromeScrollState(state, 60)

    expect(state.hidden).toBe(false)
    expect(state.direction).toBe(1)
    expect(state.distance).toBe(10)
  })

  it('always reveals at the top of the document', () => {
    const state = updateMobileChromeScrollState(
      { lastY: 90, direction: 1, distance: 30, hidden: true },
      0
    )

    expect(state.hidden).toBe(false)
  })
})
