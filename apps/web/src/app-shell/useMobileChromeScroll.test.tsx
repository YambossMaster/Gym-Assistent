// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { MOBILE_CHROME_PIN_FOR_SHORTCUT } from '../shared/MobilePwaScrollShortcut'
import { useMobileChromeScroll } from './useMobileChromeScroll'

function ChromeState() {
  return <div data-mobile-chrome={useMobileChromeScroll('/students')} />
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

it('keeps student chrome visible for the whole shortcut jump and resumes auto-hide on manual input', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {}
  }))
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const state = () => host.querySelector('div')?.getAttribute('data-mobile-chrome')
  try {
    await act(async () => root.render(<ChromeState />))
    await act(async () => {
      window.scrollY = 80
      window.dispatchEvent(new Event('scroll'))
    })
    expect(state()).toBe('hidden')

    await act(async () => window.dispatchEvent(new Event(MOBILE_CHROME_PIN_FOR_SHORTCUT)))
    expect(state()).toBe('visible')
    await act(async () => {
      window.scrollY = 400
      window.dispatchEvent(new Event('scroll'))
      window.scrollY = 800
      window.dispatchEvent(new Event('scroll'))
    })
    expect(state()).toBe('visible')

    await act(async () => window.dispatchEvent(new Event('pointerdown')))
    await act(async () => {
      window.scrollY = 840
      window.dispatchEvent(new Event('scroll'))
    })
    expect(state()).toBe('hidden')
  } finally {
    await act(async () => root.unmount())
  }
})
