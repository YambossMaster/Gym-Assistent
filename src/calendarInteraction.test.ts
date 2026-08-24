import { describe, expect, it } from 'vitest'
import { classifyPointerGesture, draggedStartMinute } from './calendarInteraction'

describe('calendar pointer gestures', () => {
  it('treats a press with tiny movement as a click', () => {
    expect(classifyPointerGesture({ x: 100, y: 100 }, { x: 103, y: 102 })).toBe('click')
  })

  it('starts a drag after moving beyond the intent threshold in any direction', () => {
    expect(classifyPointerGesture({ x: 100, y: 100 }, { x: 108, y: 100 })).toBe('drag')
    expect(classifyPointerGesture({ x: 100, y: 100 }, { x: 100, y: 108 })).toBe('drag')
  })

  it('preserves the point grabbed inside an event instead of jumping its start to the pointer', () => {
    expect(draggedStartMinute(300, 20, 900)).toBe(280)
    expect(draggedStartMinute(5, 20, 900)).toBe(0)
  })
})
