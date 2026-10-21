// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import {
  StudentSingleLessonPriceField,
  readSingleLessonPrice
} from './StudentSingleLessonPriceField'

it('keeps absent price distinct from explicit zero and reads saved currency', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <form>
          <StudentSingleLessonPriceField defaultCurrency="TWD" />
        </form>
      )
    )
    const form = host.querySelector('form')!
    expect(host.textContent).toContain('學生課堂單價')
    expect(host.textContent).not.toContain('TWD')
    expect(host.textContent).not.toContain('幣別')
    expect(host.querySelector('[aria-label="學生課堂單價幣別"]')).toBeNull()
    expect(readSingleLessonPrice(new FormData(form))).toBeNull()
    const input = host.querySelector<HTMLInputElement>('[aria-label="學生課堂單價"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '0')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(readSingleLessonPrice(new FormData(form))).toEqual({ amountMinor: 0, currency: 'TWD' })
    await act(async () =>
      root.render(
        <form>
          <StudentSingleLessonPriceField
            key="saved"
            initial={{ amountMinor: 1299, currency: 'USD' }}
            defaultCurrency="TWD"
          />
        </form>
      )
    )
    expect(readSingleLessonPrice(new FormData(host.querySelector('form')!))).toEqual({
      amountMinor: 1299,
      currency: 'USD'
    })
    expect(host.textContent).not.toContain('USD')
  } finally {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  }
})
