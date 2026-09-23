// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SeriesDatePicker } from './SeriesDatePicker'

describe('SeriesDatePicker', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('closes on the second trigger click and keeps the selected date', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const host = document.createElement('div')
    host.className = 'scheduling-dialog'
    document.body.append(host)
    const root = createRoot(host)
    const onChange = vi.fn()
    try {
      await act(async () =>
        root.render(<SeriesDatePicker value="2026-06-27" onChange={onChange} />)
      )
      const trigger = host.querySelector<HTMLButtonElement>('.series-date-trigger')!
      await act(async () => trigger.click())
      expect(trigger.getAttribute('aria-expanded')).toBe('true')
      expect(host.querySelector('[aria-label="選擇起始日期"]')).not.toBeNull()
      await act(async () => trigger.click())
      expect(trigger.getAttribute('aria-expanded')).toBe('false')
      expect(host.querySelector('[aria-label="選擇起始日期"]')).toBeNull()
      expect(onChange).not.toHaveBeenCalled()
    } finally {
      await act(async () => root.unmount())
    }
  })
})
