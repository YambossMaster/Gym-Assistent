// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import {
  advanceTrainingSetInput,
  getSetInputDockInset,
  getSetInputFocusAdjustment,
  getSetInputScrollAdjustment,
  selectTrainingSetValue
} from './set-input-navigation'

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

it('selects an existing set value when its input receives focus', () => {
  const input = document.createElement('input')
  input.type = 'number'
  input.value = '59'
  input.className = 'value'
  const row = document.createElement('div')
  row.className = 'training-set-card'
  row.append(input)
  document.body.append(row)
  const select = vi.spyOn(input, 'select')

  selectTrainingSetValue(input)
  expect(select).toHaveBeenCalledOnce()

  input.value = ''
  selectTrainingSetValue(input)
  expect(select).toHaveBeenCalledOnce()
})

it('moves through dimensions and RPE across sets but stops at the exercise boundary', () => {
  const host = document.createElement('div')
  host.innerHTML = `
    <article class="training-exercise-card">
      <div class="training-set-card"><input aria-label="重量"><input aria-label="次數"><input aria-label="RPE"></div>
      <div class="training-set-card"><input aria-label="重量"><input aria-label="次數"><input aria-label="RPE"></div>
    </article>
    <article class="training-exercise-card">
      <div class="training-set-card"><input aria-label="重量"></div>
    </article>`
  document.body.append(host)
  const inputs = host.querySelectorAll<HTMLInputElement>('input')

  for (let index = 0; index < 5; index++) {
    inputs[index]!.focus()
    advanceTrainingSetInput(inputs[index])
    expect(document.activeElement).toBe(inputs[index + 1])
  }

  advanceTrainingSetInput(inputs[5])
  expect(document.activeElement).not.toBe(inputs[6])
  expect(document.activeElement).not.toBe(inputs[5])
})

it('scrolls a focused field clear of the keyboard action dock', () => {
  expect(
    getSetInputScrollAdjustment({
      inputTop: 290,
      inputBottom: 334,
      visibleTop: 12,
      visibleBottom: 310
    })
  ).toBe(24)
  expect(
    getSetInputScrollAdjustment({
      inputTop: 240,
      inputBottom: 280,
      visibleTop: 12,
      visibleBottom: 310
    })
  ).toBe(0)
  expect(
    getSetInputScrollAdjustment({
      inputTop: 4,
      inputBottom: 44,
      visibleTop: 12,
      visibleBottom: 310
    })
  ).toBe(-8)
})

it('uses the same resting position for every field in a row, including the first focus', () => {
  const bounds = { visibleTop: 0, visibleBottom: 560 }
  expect(getSetInputFocusAdjustment({ inputTop: 480, inputBottom: 520, ...bounds })).toBe(300)
  expect(getSetInputFocusAdjustment({ inputTop: 180, inputBottom: 220, ...bounds })).toBe(0)
  expect(getSetInputFocusAdjustment({ inputTop: 620, inputBottom: 660, ...bounds })).toBe(440)
})

it.each([0, 55, 96, 151])(
  'anchors the action dock to the visible keyboard edge after a %ipx iOS pan',
  (visualOffsetTop) => {
    const layoutHeight = 844
    const visualHeight = 480
    const inset = getSetInputDockInset({ layoutHeight, visualHeight, visualOffsetTop })
    const dockBottom = layoutHeight - inset - 8
    const visibleKeyboardTop = visualOffsetTop + visualHeight

    expect(dockBottom).toBe(visibleKeyboardTop - 72)
  }
)

it('does not add a keyboard inset when Android resizes the layout viewport', () => {
  expect(getSetInputDockInset({ layoutHeight: 480, visualHeight: 480, visualOffsetTop: 0 })).toBe(0)
})
