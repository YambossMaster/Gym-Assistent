// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { SetInputAdvanceDock } from './SetInputAdvanceDock'

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

it('offers an app-owned next action when a numeric keyboard has no Enter key', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const exercise = document.createElement('article')
  exercise.className = 'training-exercise-card'
  exercise.innerHTML = `
    <div class="training-set-card"><input aria-label="重量"><input aria-label="次數"><input aria-label="RPE"></div>
    <div class="training-set-card"><input aria-label="重量"><input aria-label="次數"><input aria-label="RPE"></div>`
  const host = document.createElement('div')
  document.body.append(exercise, host)
  const root = createRoot(host)
  const inputs = exercise.querySelectorAll<HTMLInputElement>('input')

  inputs[0]!.focus()
  await act(async () => root.render(<SetInputAdvanceDock target={inputs[0]!} />))
  expect(host.textContent).toContain('第 1 組 · 重量')
  expect(host.querySelector('button')?.textContent).toContain('下一格')

  const pointerDown = new MouseEvent('pointerdown', { bubbles: true, cancelable: true })
  expect(host.querySelector<HTMLButtonElement>('button')!.dispatchEvent(pointerDown)).toBe(false)
  expect(document.activeElement).toBe(inputs[0])
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
  expect(document.activeElement).toBe(inputs[1])

  await act(async () => root.render(<SetInputAdvanceDock target={inputs[5]!} />))
  inputs[5]!.focus()
  expect(host.querySelector('button')?.textContent).toContain('完成輸入')
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
  expect(document.activeElement).not.toBe(inputs[5])

  await act(async () => root.unmount())
})
