// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { advanceTrainingSetInput, selectTrainingSetValue } from './set-input-navigation'

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
