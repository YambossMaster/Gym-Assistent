// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { settleSetInputDismissal } from './set-input-dismissal'

afterEach(() => vi.useRealTimers())

it('checks silent native movement before paint throughout dismissal and cancels its frame', () => {
  vi.useFakeTimers()
  const viewport = Object.assign(new EventTarget(), { height: 480 })
  let nativePan = 0
  const restore = vi.fn(() => {
    nativePan = 0
    return true
  })
  const stop = settleSetInputDismissal(viewport as VisualViewport, 844, restore)
  nativePan = 250
  vi.advanceTimersToNextFrame()
  expect(nativePan).toBe(0)
  stop()
  const count = restore.mock.calls.length
  vi.advanceTimersByTime(100)
  expect(restore).toHaveBeenCalledTimes(count)
  expect(vi.getTimerCount()).toBe(0)
})

it('recovers late window and viewport events, then releases after the keyboard settles', () => {
  vi.useFakeTimers()
  const viewport = Object.assign(new EventTarget(), { height: 650 })
  const restore = vi.fn(() => true)
  settleSetInputDismissal(viewport as VisualViewport, 844, restore)
  vi.advanceTimersByTime(600)
  restore.mockClear()
  window.dispatchEvent(new Event('scroll'))
  viewport.height = 844
  viewport.dispatchEvent(new Event('resize'))
  expect(restore).toHaveBeenCalledTimes(2)
  vi.advanceTimersByTime(401)
  const settledCalls = restore.mock.calls.length
  window.dispatchEvent(new Event('scroll'))
  expect(restore).toHaveBeenCalledTimes(settledCalls)
  expect(vi.getTimerCount()).toBe(0)
})

it.each(['pointerdown', 'touchstart', 'wheel'])(
  'gives ownership to a new %s immediately',
  (event) => {
    vi.useFakeTimers()
    const restore = vi.fn(() => true)
    settleSetInputDismissal(null, 844, restore)
    window.dispatchEvent(new Event(event))
    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('scroll'))
    expect(restore).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  }
)

it('has a hard limit even without a final keyboard event and supports explicit cancellation', () => {
  vi.useFakeTimers()
  const viewport = Object.assign(new EventTarget(), { height: 480 })
  const restore = vi.fn(() => true)
  settleSetInputDismissal(viewport as VisualViewport, 844, restore)
  vi.advanceTimersByTime(2500)
  restore.mockClear()
  viewport.dispatchEvent(new Event('scroll'))
  expect(restore).not.toHaveBeenCalled()
  const stop = settleSetInputDismissal(viewport as VisualViewport, 844, restore)
  stop()
  viewport.dispatchEvent(new Event('resize'))
  expect(restore).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})

it('stops immediately when its field is no longer connected', () => {
  vi.useFakeTimers()
  const restore = vi.fn(() => false)
  settleSetInputDismissal(null, 844, restore)
  window.dispatchEvent(new Event('scroll'))
  window.dispatchEvent(new Event('scroll'))
  expect(restore).toHaveBeenCalledTimes(1)
  expect(vi.getTimerCount()).toBe(0)
})

it('keeps an advancing close animation protected past the original session deadline', () => {
  vi.useFakeTimers()
  const viewport = Object.assign(new EventTarget(), { height: 480, offsetTop: 0 })
  const restore = vi.fn(() => true)
  settleSetInputDismissal(viewport as VisualViewport, 844, restore)
  vi.advanceTimersByTime(2400)
  viewport.height = 780
  viewport.offsetTop = 10
  viewport.dispatchEvent(new Event('resize'))
  vi.advanceTimersByTime(300)
  restore.mockClear()
  window.dispatchEvent(new Event('scroll'))
  expect(restore).toHaveBeenCalledOnce()
  viewport.height = 844
  viewport.offsetTop = 0
  viewport.dispatchEvent(new Event('resize'))
  vi.advanceTimersByTime(300)
  restore.mockClear()
  window.dispatchEvent(new Event('scroll'))
  expect(restore).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})
