import { describe, expect, it, vi } from 'vitest'
import {
  clampDragTop,
  compactListHeight,
  compactRowTop,
  compactScrollCorrection,
  edgeScrollVelocity,
  ExerciseReorderBuffer,
  moveItem,
  shouldSwapAdjacent
} from './exercise-reorder'

describe('exercise reorder', () => {
  it('moves through ordered adjacent swaps and commits the final order once', () => {
    const commit = vi.fn()
    const drag = new ExerciseReorderBuffer(['one', 'two', 'three'], commit)

    expect(drag.step('one', 1)).toEqual(['two', 'one', 'three'])
    expect(drag.step('one', 1)).toEqual(['two', 'three', 'one'])
    expect(commit).not.toHaveBeenCalled()

    drag.commit()
    drag.commit()
    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith(['two', 'three', 'one'])
  })

  it('does not commit when the card returns to its original position', () => {
    const commit = vi.fn()
    const drag = new ExerciseReorderBuffer(['one', 'two'], commit)
    drag.step('one', 1)
    drag.step('one', -1)
    drag.commit()
    expect(commit).not.toHaveBeenCalled()
  })

  it('moves one keyboard step without mutating the source order', () => {
    const source = ['one', 'two', 'three']
    expect(moveItem(source, 1, 0)).toEqual(['two', 'one', 'three'])
    expect(source).toEqual(['one', 'two', 'three'])
  })

  it('exchanges after crossing an adjacent threshold, including skipped rows', () => {
    expect(shouldSwapAdjacent(1, 26, 58, 66, 58)).toBe(false)
    expect(shouldSwapAdjacent(1, 27, 58, 66, 58)).toBe(true)
    expect(shouldSwapAdjacent(-1, 40, 58, 0, 58)).toBe(false)
    expect(shouldSwapAdjacent(-1, 39, 58, 0, 58)).toBe(true)

    expect(shouldSwapAdjacent(1, 0, 58, 66, 58)).toBe(false)
    expect(shouldSwapAdjacent(-1, 70, 58, 0, 58)).toBe(false)
    expect(shouldSwapAdjacent(1, 250, 58, 66, 58)).toBe(true)
    expect(shouldSwapAdjacent(-1, 0, 58, 198, 58)).toBe(true)
  })

  it('collapses the document to the real compact list height', () => {
    expect(compactListHeight(9, 58, 8)).toBe(586)
    expect(compactListHeight(0, 58, 8)).toBe(0)
    expect(compactRowTop(120, 3, 58, 8)).toBe(318)
  })

  it('computes the scroll correction that keeps the held row beneath the pointer', () => {
    expect(compactScrollCorrection(480, 520, 20)).toBe(-20)
    expect(compactScrollCorrection(560, 520, 20)).toBe(60)
  })

  it('keeps the dragged row visible inside both the list and the usable viewport', () => {
    expect(clampDragTop(300, 100, 700, 0, 650, 58)).toBe(300)
    expect(clampDragTop(20, 100, 700, 0, 650, 58)).toBe(100)
    expect(clampDragTop(760, 100, 700, 0, 650, 58)).toBe(592)
  })

  it('stops in the middle and reverses immediately between viewport edges', () => {
    expect(edgeScrollVelocity(400, 0, 800, 80, 480)).toBe(0)
    expect(edgeScrollVelocity(760, 0, 800, 80, 480)).toBeGreaterThan(0)
    expect(edgeScrollVelocity(40, 0, 800, 80, 480)).toBeLessThan(0)
    expect(edgeScrollVelocity(720, 0, 800, 80, 480)).toBe(0)
    expect(edgeScrollVelocity(80, 0, 800, 80, 480)).toBe(0)
  })
})
