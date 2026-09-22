import { describe, expect, it } from 'vitest'
import { consumeStartAnchor, startAnchorSpace } from './exercise-drag-start-anchor'

describe('optional drag-start anchoring', () => {
  it('fills only the scroll correction the browser could not perform', () => {
    expect(startAnchorSpace(-194)).toEqual({ leading: 194, trailing: 0 })
    expect(startAnchorSpace(80)).toEqual({ leading: 0, trailing: 80 })
    expect(startAnchorSpace(0)).toEqual({ leading: 0, trailing: 0 })
  })
  it('can be disabled without changing drop restoration or scroll bounds', () => {
    expect(startAnchorSpace(-194, false)).toEqual({ leading: 0, trailing: 0 })
    expect(startAnchorSpace(80, false)).toEqual({ leading: 0, trailing: 0 })
  })
  it('retires the initial leading space once the first row reaches the header', () => {
    const initial = { leading: 194, trailing: 0 }
    expect(consumeStartAnchor(initial, 300, 886, 120, 700)).toEqual(initial)
    expect(consumeStartAnchor(initial, 120, 706, 120, 700)).toEqual({ leading: 0, trailing: 0 })
    expect(consumeStartAnchor({ leading: 0, trailing: 0 }, 200, 786, 120, 700)).toEqual({
      leading: 0,
      trailing: 0
    })
  })
  it('retires trailing space when the last row reaches the footer', () => {
    expect(consumeStartAnchor({ leading: 0, trailing: 90 }, -20, 566, 120, 700)).toEqual({
      leading: 0,
      trailing: 90
    })
    expect(consumeStartAnchor({ leading: 0, trailing: 90 }, 114, 700, 120, 700)).toEqual({
      leading: 0,
      trailing: 0
    })
  })
})
