// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { RequiredFieldLabel } from './FormFieldLabel'
import { useDialogBehavior } from './useDialogBehavior'

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

it('renders the shared compact required-field title', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)

  await act(async () => root.render(<RequiredFieldLabel>學生</RequiredFieldLabel>))

  expect(host.textContent).toBe('學生*')
  expect(host.querySelector('.ui-required-mark')?.getAttribute('aria-label')).toBe('必填')
  await act(async () => root.unmount())
})

it('shows the shared mobile continuation cue only while the declared region has more content', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  vi.stubGlobal('matchMedia', () => ({ matches: true }))

  function Harness() {
    const { dialogRef } = useDialogBehavior(() => undefined, { lockScroll: false })
    return (
      <section ref={dialogRef} className="settings-operation-dialog">
        <div data-dialog-scroll-region>內容</div>
      </section>
    )
  }

  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => root.render(<Harness />))

  const dialog = host.querySelector<HTMLElement>('.settings-operation-dialog')!
  const region = host.querySelector<HTMLElement>('[data-dialog-scroll-region]')!
  let scrollTop = 0
  Object.defineProperties(region, {
    clientHeight: { configurable: true, value: 200 },
    scrollHeight: { configurable: true, value: 500 },
    scrollTop: { configurable: true, get: () => scrollTop }
  })
  vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    right: 320,
    top: 0,
    bottom: 600,
    width: 320,
    height: 600,
    x: 0,
    y: 0,
    toJSON: () => ({})
  })
  vi.spyOn(region, 'getBoundingClientRect').mockReturnValue({
    left: 16,
    right: 304,
    top: 100,
    bottom: 500,
    width: 288,
    height: 400,
    x: 16,
    y: 100,
    toJSON: () => ({})
  })

  await act(async () => window.dispatchEvent(new Event('resize')))
  expect(dialog.classList.contains('ui-dialog-has-more')).toBe(true)
  expect(dialog.style.getPropertyValue('--ui-scroll-cue-bottom')).toBe('100px')

  scrollTop = 300
  await act(async () => region.dispatchEvent(new Event('scroll', { bubbles: true })))
  expect(dialog.classList.contains('ui-dialog-has-more')).toBe(false)

  await act(async () => root.unmount())
})
