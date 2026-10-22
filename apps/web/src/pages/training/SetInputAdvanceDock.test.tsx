// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { SetInputAdvanceDock } from './SetInputAdvanceDock'

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

it('does not let a compatibility mousedown steal focus after advancing', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const exercise = document.createElement('article')
  exercise.className = 'training-exercise-card'
  exercise.innerHTML = '<div class="training-set-card"><input><input></div>'
  const host = document.createElement('div')
  document.body.append(exercise, host)
  const root = createRoot(host)
  const inputs = exercise.querySelectorAll<HTMLInputElement>('input')
  await act(async () => root.render(<SetInputAdvanceDock target={inputs[0]!} />))
  const button = host.querySelector<HTMLButtonElement>('button')!
  inputs[0]!.focus()
  await act(async () => {
    button.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' })
    )
    button.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'touch' })
    )
  })
  expect(document.activeElement).toBe(inputs[1])
  const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  await act(async () => {
    // Replay the browser default only if the compatibility event is uncancelled.
    if (button.dispatchEvent(down)) button.focus()
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
  })
  expect(document.activeElement).toBe(inputs[1])
  await act(async () => root.unmount())
})

it('consumes one release only even when the following click has zero detail', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const exercise = document.createElement('article')
  exercise.className = 'training-exercise-card'
  exercise.innerHTML = '<div class="training-set-card"><input><input></div>'
  const host = document.createElement('div')
  document.body.append(exercise, host)
  const root = createRoot(host)
  const inputs = exercise.querySelectorAll<HTMLInputElement>('input')
  const render = () =>
    root.render(<SetInputAdvanceDock target={document.activeElement as HTMLInputElement} />)
  inputs.forEach((input) => input.addEventListener('focus', render))
  await act(async () => inputs[0]!.focus())
  const button = host.querySelector<HTMLButtonElement>('button')!
  await act(async () => {
    button.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' })
    )
    button.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'touch' })
    )
  })
  expect(document.activeElement).toBe(inputs[1])
  await act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 })))
  expect(document.activeElement).toBe(inputs[1])
  // A subsequent keyboard action is a new activation, even without pointerdown.
  await act(async () => {
    button.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
    button.click()
  })
  expect(document.activeElement).not.toBe(inputs[1])
  await act(async () => root.unmount())
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

it('keeps the advance target through a touch blur and focuses the next input on click', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const exercise = document.createElement('article')
  exercise.className = 'training-exercise-card'
  exercise.innerHTML = '<div class="training-set-card"><input><input></div>'
  const host = document.createElement('div')
  document.body.append(exercise, host)
  const root = createRoot(host)
  const inputs = exercise.querySelectorAll<HTMLInputElement>('input')
  let gestureActive = false
  const props = {
    onGestureStart: () => {
      gestureActive = true
    },
    onGestureEnd: () => {
      gestureActive = false
    }
  }
  inputs[0]!.focus()
  await act(async () => root.render(<SetInputAdvanceDock target={inputs[0]!} {...props} />))

  const button = host.querySelector<HTMLButtonElement>('button')!
  await act(async () => {
    button.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' })
    )
    inputs[0]!.blur()
    // The workspace retains the target while the dock gesture is in progress.
    await root.render(<SetInputAdvanceDock target={gestureActive ? inputs[0]! : null} {...props} />)
  })
  expect(gestureActive).toBe(true)
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
  expect(document.activeElement).toBe(inputs[1])
  expect(gestureActive).toBe(false)
  await act(async () => root.unmount())
  host.remove()
})
