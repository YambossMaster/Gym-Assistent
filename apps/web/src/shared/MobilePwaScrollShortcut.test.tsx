// @vitest-environment jsdom
import { act, createRef } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { MOBILE_CHROME_PIN_FOR_SHORTCUT, MobilePwaScrollShortcut } from './MobilePwaScrollShortcut'

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

it('shows the student shortcut only for a long installed mobile page and changes direction halfway', async () => {
  vi.stubEnv('DEV', false)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let installed = false
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches:
      query === '(max-width: 720px)' || (query === '(display-mode: standalone)' && installed),
    addEventListener() {},
    removeEventListener() {}
  }))
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: 1600
  })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 })
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true })
  const scrollTo = vi.fn()
  vi.stubGlobal('scrollTo', scrollTo)
  const pinChrome = vi.fn()
  window.addEventListener(MOBILE_CHROME_PIN_FOR_SHORTCUT, pinChrome)
  const target = document.createElement('div')
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ top: 900 } as DOMRect)
  const targetRef = createRef<HTMLDivElement>()
  Object.defineProperty(targetRef, 'current', { value: target })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(<MobilePwaScrollShortcut itemCount={5} bottomTargetRef={targetRef} />)
    )
    expect(host.querySelector('button')).toBeNull()
    installed = true
    await act(async () =>
      root.render(<MobilePwaScrollShortcut itemCount={4} bottomTargetRef={targetRef} />)
    )
    expect(host.querySelector('button')).toBeNull()
    await act(async () =>
      root.render(<MobilePwaScrollShortcut itemCount={5} bottomTargetRef={targetRef} />)
    )
    const button = host.querySelector('button')!
    expect(button.getAttribute('aria-label')).toBe('直達本月收支與場地管理')
    await act(async () => button.click())
    expect(pinChrome).toHaveBeenCalledTimes(1)
    expect(scrollTo).toHaveBeenCalledWith({ top: 888, behavior: 'smooth' })
    window.scrollY = 600
    await act(async () => window.dispatchEvent(new Event('scroll')))
    expect(button.getAttribute('aria-label')).toBe('回到頁面頂部')
    await act(async () => button.click())
    expect(pinChrome).toHaveBeenCalledTimes(1)
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  } finally {
    window.removeEventListener(MOBILE_CHROME_PIN_FOR_SHORTCUT, pinChrome)
    await act(async () => root.unmount())
  }
})

it('offers exercise return to top only after scrolling a long installed page', async () => {
  vi.stubEnv('DEV', false)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query !== '(prefers-reduced-motion: reduce)',
    addEventListener() {},
    removeEventListener() {}
  }))
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: 1600
  })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 })
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () => root.render(<MobilePwaScrollShortcut itemCount={5} />))
    expect(host.querySelector('button')).toBeNull()
    window.scrollY = 200
    await act(async () => window.dispatchEvent(new Event('scroll')))
    expect(host.querySelector('button')?.getAttribute('aria-label')).toBe('回到頁面頂部')
  } finally {
    await act(async () => root.unmount())
  }
})

it('allows mobile browser emulation on the local Vite development server', async () => {
  vi.stubEnv('DEV', true)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(max-width: 720px)',
    addEventListener() {},
    removeEventListener() {}
  }))
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: 1600
  })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 })
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  const targetRef = createRef<HTMLDivElement>()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(<MobilePwaScrollShortcut itemCount={5} bottomTargetRef={targetRef} />)
    )
    expect(host.querySelector('button')?.getAttribute('aria-label')).toBe('直達本月收支與場地管理')
  } finally {
    await act(async () => root.unmount())
  }
})
