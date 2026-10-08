import { describe, expect, it } from 'vitest'
import { getNoteFocusViewport, getNoteKeyboardInset } from './note-viewport'

describe('mobile note viewport', () => {
  it('keeps the keyboard inset stable when a browser pans the visual viewport', () => {
    const keyboardAtRest = getNoteKeyboardInset({
      layoutHeight: 844,
      visualHeight: 480,
      visualOffsetTop: 0
    })
    const keyboardAfterPan = getNoteKeyboardInset({
      layoutHeight: 844,
      visualHeight: 480,
      visualOffsetTop: 96
    })

    expect(keyboardAtRest).toBe(364)
    expect(keyboardAfterPan).toBe(keyboardAtRest)
  })

  it('does not add a second inset when Android resizes both viewports', () => {
    expect(
      getNoteKeyboardInset({
        layoutHeight: 480,
        visualHeight: 480,
        visualOffsetTop: 0
      })
    ).toBe(0)
  })

  it('ignores small viewport changes that are not a software keyboard', () => {
    expect(
      getNoteKeyboardInset({
        layoutHeight: 800,
        visualHeight: 720,
        visualOffsetTop: 0
      })
    ).toBe(0)
  })

  it('keeps the focused writing surface aligned to the visible viewport while iOS pans it', () => {
    expect(
      getNoteFocusViewport({
        layoutHeight: 844,
        visualHeight: 480,
        visualOffsetTop: 96
      })
    ).toEqual({ height: 480, top: 96 })
  })

  it('falls back to the layout viewport when the Visual Viewport API is unavailable', () => {
    expect(getNoteFocusViewport({ layoutHeight: 844 })).toEqual({ height: 844, top: 0 })
  })
})
